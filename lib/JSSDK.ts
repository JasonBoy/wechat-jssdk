import debugFnc from 'debug';
import isEmpty from 'lodash.isempty';
import { parse } from 'url';
import * as utils from './utils';
import { getDefaultConfiguration, checkPassedConfiguration } from './config';

import Store from './store/Store';
import FileStore from './store/FileStore';

const debug = debugFnc('wechat-JSSDK');

const wxConfig = getDefaultConfiguration();

class JSSDK {
  refreshedTimes: number;
  wechatConfig: object;
  store: Store;
  /**
   * Pass custom wechat config for the instance
   * @constructor
   * @param {object=} options
   * @see ./config.js
   * @return {JSSDK} JSSDK instance
   */
  constructor(options) {
    checkPassedConfiguration(options);
    this.refreshedTimes = 0;
    this.wechatConfig = isEmpty(options)
      ? /* istanbul ignore next  */ wxConfig
      : Object.assign({}, wxConfig, options);

    //no custom store provided, using default FileStore
    /* istanbul ignore if  */
    if (!options.store || !(options.store instanceof Store)) {
      debug('[JSSDK]Store not provided, using default FileStore...');
      this.store = new FileStore(options.storeOptions);
    } else {
      this.store = options.store;
    }

    //clear the counter every 2 hour
    setInterval(
      () => (this.refreshedTimes = 0),
      options.clearCountInterval || 1000 * 7200,
    );
  }

  /**
   * Check if token is expired starting from the modify date
   * @param modifyDate
   * @static
   * @return {boolean}
   */
  static isTokenExpired(modifyDate): boolean {
    return utils.isExpired(modifyDate);
  }

  /**
   * Create NonceStr before generating the signature
   * @static
   * @return {string}
   */
  static createNonceStr(): string {
    return utils.nonceStr();
  }

  /**
   * Filter the signature for the client
   * @param {object} originalSignatureObj original signature information
   * @return {object} filtered signature object
   */
  filterSignature(originalSignatureObj): object {
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
  static normalizeUrl(url): string {
    const temp = parse(url);
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
  static generateSignature(url, accessToken, ticket): object {
    const ret = {
      jsapi_ticket: ticket,
      nonceStr: JSSDK.createNonceStr(),
      timestamp: utils.timestamp(),
      url: JSSDK.normalizeUrl(url),
      signature: null,
      accessToken: null,
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
  verifySignature(query): boolean {
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
  getAccessToken(): Promise<object> {
    const cfg = this.wechatConfig;
    return utils.getGlobalAccessToken(
      cfg.appId,
      cfg.appSecret,
      cfg.accessTokenUrl,
    );
  }

  /**
   * Get wechat ticket with the accessToken
   * @param {string} accessToken token received from the @see getAccessToken above
   * @return {Promise}
   */
  async getJsApiTicket(accessToken): Promise<object> {
    const params = {
      access_token: accessToken,
      type: 'jsapi',
    };
    try {
      return await utils.sendWechatRequest(this.wechatConfig.ticketUrl, {
        searchParams: params,
      });
    } catch (err) {
      debug('get ticket failed!');
      return Promise.reject(err);
    }
  }

  /**
   * Update the global token or js_ticket, we should cache this to prevent requesting too often
   * @param {string} token
   * @param {string} ticket
   * @return {Promise} resolved with the updated globalToken object
   */
  async updateAccessTokenOrTicketGlobally(token, ticket): Promise<object> {
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
  async getGlobalTokenAndTicket(force): Promise<object> {
    force || this.refreshedTimes++;
    /* istanbul ignore if  */
    if (!force && this.refreshedTimes > 5) {
      return Promise.reject(
        new Error('maximum manual refresh threshold reached!'),
      );
    }
    let accessToken = '';
    try {
      const result = await this.getAccessToken();
      accessToken = result.access_token;
      const ticketResult = await this.getJsApiTicket(accessToken);
      return await this.updateAccessTokenOrTicketGlobally(
        accessToken,
        ticketResult.ticket,
      );
    } catch (err) {
      debug(err);
      return Promise.reject(err);
    }
  }

  /**
   * Get or generate global token info for signature generating process
   * @return {Promise}
   */
  async prepareGlobalToken(): Promise<object> {
    const globalToken = await this.store.getGlobalToken();
    if (
      !globalToken ||
      !globalToken.accessToken ||
      JSSDK.isTokenExpired(globalToken.modifyDate)
    ) {
      debug(
        'global access token was expired, getting new global access token and ticket now...',
      );
      return this.getGlobalTokenAndTicket(true);
    }
    debug('global ticket exists, use cached access token');
    return Promise.resolve(globalToken);
  }

  /**
   * Save or update the signature
   * @param {object} info signature information to save
   * @return {Promise}
   */
  async saveSignature(info): Promise<object> {
    const signature = Object.assign({}, info);
    signature.createDate = new Date();
    signature.modifyDate = signature.createDate;
    const existing = await this.store.isSignatureExisting(signature.url);
    let sig;
    if (existing) {
      debug('wechat url signature existed, try updating the signature...');
      sig = await this.updateSignature(signature.url, signature);
    } else {
      sig = await this.store.saveSignature(signature.signatureName, signature);
    }
    debug('create/update wechat signature finished');
    return Promise.resolve(sig);
  }

  /**
   * Update the signature for existing url
   * @param {string} url signature of url need to update
   * @param {object} info update info need to be updated to the existing url signature info
   * @return {Promise}
   */
  async updateSignature(url, info): Promise<object> {
    url = JSSDK.normalizeUrl(url);
    info.modifyDate = new Date();
    delete info.createDate;
    delete info.url; //prevent changing the original url
    delete info.signatureName; //prevent changing the original name
    const signature = await this.store.updateSignature(url, info);
    debug('update wechat signature finished');
    return Promise.resolve(signature);
  }

  /**
   * Get the signature from cache or create a new one
   * @param {string} url
   * @param {boolean=} forceNewSignature if true, generate a new signature rather than getting from cache
   * @return {Promise}
   */
  async getSignature(url, forceNewSignature): Promise<object> {
    url = JSSDK.normalizeUrl(url);
    let signature = await this.store.getSignature(url);
    if (
      !forceNewSignature &&
      signature &&
      !JSSDK.isTokenExpired(signature.modifyDate)
    ) {
      signature = this.filterSignature(signature);
      return Promise.resolve(signature);
    }
    return this.createSignature(url);
  }

  /**
   * Create a new signature now, and save to store
   * @param {string} url signature will be created for the url
   * @return {Promise} resolved with filtered signature results
   */
  async createSignature(url): Promise<object> {
    const data = await this.prepareGlobalToken();
    const ret = JSSDK.generateSignature(
      url,
      data.accessToken,
      data.jsapi_ticket,
    );
    ret.signatureName = ret.url;
    const signature = await this.saveSignature(ret);
    return Promise.resolve(this.filterSignature(signature));
  }

  /**
   * Just get url signature from cache
   * @param {string} url
   * @return {Promise} filtered signature info
   */
  async getCachedSignature(url): Promise<object> {
    url = JSSDK.normalizeUrl(url);
    const signature = await this.store.getSignature(url);
    return Promise.resolve(this.filterSignature(signature));
  }
}

export default JSSDK;
