'use strict';

const debug = require('debug')('wechat-JSSDK');
const Promise = require('bluebird');
const isEmpty = require('lodash.isempty');
const urlParser = require('url');

const utils = require('./utils');
const config = require('./config');

const Store = require('./store/Store');
const FileStore = require('./store/FileStore');

const wxConfig = config.getDefaultConfiguration();

class JSSDK {
  /**
   * Pass custom wechat config for the instance
   * @constructor
   * @param {object=} options
   * @see ./config.js
   * @return {JSSDK} JSSDK instance
   */
  constructor(options) {
    config.checkPassedConfiguration(options);
    this.refreshedTimes = 0;
    this.wechatConfig = isEmpty(options)
      ? wxConfig
      : Object.assign({}, wxConfig, options);

    //no custom store provided, using default FileStore
    if (!options.store || !(options.store instanceof Store)) {
      debug('Store not provided, using default FileStore...');
      this.store = new FileStore(options);
    } else {
      this.store = options.store;
    }

    //clear the counter every 2 hour
    setInterval(
      () => (this.refreshedTimes = 0),
      options.clearCountInterval || 1000 * 7200
    );
  }

  /**
   * Check if token is expired starting from the modify date
   * @param modifyDate
   * @static
   * @return {boolean}
   */
  static isTokenExpired(modifyDate) {
    return utils.isExpired(modifyDate);
  }

  /**
   * Create NonceStr before generating the signature
   * @static
   * @return {string}
   */
  static createNonceStr() {
    return utils.nonceStr();
  }

  /**
   * Filter the signature for the client
   * @param {object} originalSignatureObj original signature information
   * @return {object} filtered signature object
   */
  filterSignature(originalSignatureObj) {
    if (!originalSignatureObj) {
      return {};
    }
    return {
      appId: this.wechatConfig.appId,
      timestamp: originalSignatureObj.timestamp,
      nonceStr: originalSignatureObj.nonceStr,
      signature: originalSignatureObj.signature,
      url: originalSignatureObj.url,
    };
  }

  /**
   * Remove hash from the url, wechat signature does not need it
   * @param {string} url original url
   * @static
   * @return {string}
   */
  static normalizeUrl(url) {
    const temp = urlParser.parse(url);
    const hashIndex = url.indexOf(temp.hash);
    //remove hash from url
    return hashIndex > 0 ? url.substring(0, hashIndex) : url;
  }

  /**
   * Generate the url signature with the provided info
   * @param {string} url current url
   * @param {string} accessToken
   * @param {string} ticket js ticket
   * @static
   * @returns {object} generated wechat signature info
   */
  static generateSignature(url, accessToken, ticket) {
    const ret = {
      jsapi_ticket: ticket,
      nonceStr: JSSDK.createNonceStr(),
      timestamp: utils.timestamp(),
      url: JSSDK.normalizeUrl(url),
    };
    const originalStr = utils.paramsToString(ret);
    ret.signature = utils.genSHA1(originalStr);
    ret.accessToken = accessToken;
    return ret;
  }

  /**
   * Need to verify before you are a wechat developer
   * @param {object} query url query sent by the wechat server to do the validation
   * @return {boolean}
   */
  verifySignature(query) {
    const keys = [
      this.wechatConfig.wechatToken,
      query['timestamp'],
      query['nonce'],
    ];
    let str = keys.sort().join('');
    str = utils.genSHA1(str);
    return str === query.signature;
  }

  /**
   * Send request to get wechat access token
   * @return {Promise}
   */
  getAccessToken() {
    const cfg = this.wechatConfig;
    return utils.getGlobalAccessToken(
      cfg.appId,
      cfg.appSecret,
      cfg.accessTokenUrl
    );
  }

  /**
   * Get wechat ticket with the accessToken
   * @param {string} accessToken token received from the @see getAccessToken above
   * @return {Promise}
   */
  getJsApiTicket(accessToken) {
    const params = {
      access_token: accessToken,
      type: 'jsapi',
    };
    return utils
      .sendWechatRequest({
        url: this.wechatConfig.ticketUrl,
        qs: params,
      })
      .then(data => data)
      .catch(reason => {
        debug('get ticket failed!');
        return Promise.reject(reason);
      });
  }

  /**
   * Update the global token or js_ticket, we should cache this to prevent requesting too often
   * @param {string} token
   * @param {string} ticket
   * @return {Promise} resolved with the updated globalToken object
   */
  updateAccessTokenOrTicketGlobally(token, ticket) {
    const info = { modifyDate: new Date() };
    token && (info.accessToken = token);
    ticket && (info.jsapi_ticket = ticket);
    return this.store.updateGlobalToken(info);
  }

  /**
   * Get new access token and ticket from wechat server, and update that to cache
   * @param {boolean=} force force update, by default it will only get at most 5 times within 2 hours,
   *        cause the wechat server limits the access_token requests number
   * @return {Promise}
   */
  getGlobalTokenAndTicket(force) {
    force || this.refreshedTimes++;
    if (!force && this.refreshedTimes > 5) {
      return Promise.reject(
        new Error('maximum manual refresh threshold reached!')
      );
    }
    let accessToken = '';
    return this.getAccessToken()
      .then(result => {
        accessToken = result.access_token;
        return accessToken;
      })
      .catch(reason => {
        debug('get new global token failed!');
        return Promise.reject(reason);
      })
      .then(receivedAccessToken => {
        return this.getJsApiTicket(receivedAccessToken);
      })
      .then(ticketResult => {
        return this.updateAccessTokenOrTicketGlobally(
          accessToken,
          ticketResult.ticket
        );
      })
      .catch(ticketReason => {
        debug('get new global ticket failed!');
        debug(ticketReason);
        return Promise.reject(ticketReason);
      });
  }

  /**
   * Get or generate global token info for signature generating process
   * @return {Promise}
   */
  prepareGlobalToken() {
    return this.store.getGlobalToken().then(globalToken => {
      if (
        !globalToken ||
        !globalToken.accessToken ||
        JSSDK.isTokenExpired(globalToken.modifyDate)
      ) {
        debug(
          'global access token was expired, getting new global access token and ticket now...'
        );
        return this.getGlobalTokenAndTicket(true);
      }
      debug('global ticket exists, use cached access token');
      return Promise.resolve(globalToken);
    });
  }

  /**
   * Save or update the signature
   * @param {object} info signature information to save
   * @return {Promise}
   */
  saveSignature(info) {
    const signature = Object.assign({}, info);
    signature.createDate = new Date();
    signature.modifyDate = signature.createDate;
    return this.store
      .isSignatureExisting(signature.url)
      .then(existing => {
        if (existing) {
          debug('wechat url signature existed, try updating the signature...');
          return this.updateSignature(signature.url, signature);
        }
        return this.store.saveSignature(signature.signatureName, signature);
      })
      .then(sig => {
        debug('create/update wechat signature finished');
        return Promise.resolve(sig);
      });
  }

  /**
   * Update the signature for existing url
   * @param {string} url signature of url need to update
   * @param {object} info update info need to be updated to the existing url signature info
   * @return {Promise}
   */
  updateSignature(url, info) {
    url = JSSDK.normalizeUrl(url);
    info.modifyDate = new Date();
    delete info.createDate;
    delete info.url; //prevent changing the original url
    delete info.signatureName; //prevent changing the original name
    return this.store.updateSignature(url, info).then(sig => {
      debug('update wechat signature finished');
      return Promise.resolve(sig);
    });
  }

  /**
   * Get the signature from cache or create a new one
   * @param {string} url
   * @param {boolean=} forceNewSignature if true, generate a new signature rather than getting from cache
   * @return {Promise}
   */
  getSignature(url, forceNewSignature) {
    url = JSSDK.normalizeUrl(url);
    return this.store.getSignature(url).then(signature => {
      if (
        !forceNewSignature &&
        signature &&
        !JSSDK.isTokenExpired(signature.modifyDate)
      ) {
        signature = this.filterSignature(signature);
        return Promise.resolve(signature);
      }
      return this.createSignature(url);
    });
  }

  /**
   * Create a new signature now, and save to store
   * @param {string} url signature will be created for the url
   * @return {Promise} resolved with filtered signature results
   */
  createSignature(url) {
    return this.prepareGlobalToken()
      .then(data => {
        const ret = JSSDK.generateSignature(
          url,
          data.accessToken,
          data.jsapi_ticket
        );
        ret.signatureName = ret.url;
        return this.saveSignature(ret);
      })
      .then(sig => this.filterSignature(sig));
  }

  /**
   * Just get url signature from cache
   * @param {string} url
   * @return {Promise} filtered signature info
   */
  getCachedSignature(url) {
    url = JSSDK.normalizeUrl(url);
    return this.store.getSignature(url).then(signature => {
      return Promise.resolve(this.filterSignature(signature));
    });
  }
}

module.exports = JSSDK;
