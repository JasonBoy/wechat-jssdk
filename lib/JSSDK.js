const debug = require('debug')('wechat');
const promise = require('bluebird');
const _ = require('lodash');

const util = require('./utils');
const config = require('./config');
const cache = require('./cache');

const wxConfig = config.getConfiguration();

//1h 59m, token is only valid within 2 hours
const REFRESH_INTERVAL = 1000 * 119 * 60;

let refreshedTimes = 0;

class JSSDK {

  /**
   * Pass custom wechat config for the instance
   * @constructor
   * @param config
   *   @see ./config.js
   * @returns {JSSDK} JSSDK instance
   */
  constructor (config) {
    // Manually call 'new' if user forgets
    if (!new.target) return new JSSDK(config);

    this.refreshedTimes = 0;
    this.REFRESH_INTERVAL = REFRESH_INTERVAL;
    this.wechatConfig = _.isEmpty(config) ? wxConfig : Object.assign({}, wxConfig, config);

    //clear the counter every 2 hour
    setInterval(() => this.refreshedTimes = 0, 1000 * 7200);
  }

  /**
   * need to verify before you are a wechat developer
   * @param query
   * @returns {boolean}
   */
  verifySignature (query) {
    const keys = [this.wechatConfig.wechatToken, query['timestamp'], query['nonce']];
    let str = keys.sort().join('');
    str = util.genSHA1(str);
    return str === query.signature;
  }

  /**
   * send request to get wechat access token
   */
  getAccessToken () {
    const params = {
      grant_type: 'client_credential',
      appid: this.wechatConfig.appId,
      secret: this.wechatConfig.appSecret,
    };
    return util.sendWechatRequest({
        url: this.wechatConfig.accessTokenUrl,
        baseUrl: '',
        qs: params,
      })
      .then(data => data)
      .catch((reason) => {
        debug('get wechat access token failed!');
        return promise.reject(reason);
      });
  }

  /**
   * get wechat ticket with the accessToken
   * @param accessToken token received from the @see getAccessToken above
   */
  getWechatTicket (accessToken) {
    const params = {
      access_token: accessToken,
      type: 'jsapi',
    };
    return util.sendWechatRequest({
        url: this.wechatConfig.ticketUrl,
        baseUrl: '',
        qs: params,
      })
      .then(data => data)
      .catch((reason) => {
        debug('get ticket failed!');
        return promise.reject(reason);
      });
  }

  /**
   * update the global token or js_ticket, we should cache this to prevent request too often
   * @param token
   * @param ticket
   */
  updateAccessTokenOrTicketGlobally (token, ticket) {
    const info = {modifyDate: new Date};
    token && (info.accessToken = token);
    ticket && (info.jsapi_ticket = ticket);
    const globalToken = Object.assign(cache.globalToken, info);
    globalToken.count++;
    debug('Access Token or jsapi ticket updated');
    return promise.resolve(globalToken);
  }

  /**
   * get new access token and ticket from wechat server, and update that to cache
   * @param force force update, by default it will only get at most 5 times within 2 hours,
   *        cause the wechat server limits the token access times
   */
  getNewTokenAndTicket (force) {
    //temp way to prevent refresh too often
    force || refreshedTimes++;
    if(!force && refreshedTimes > 5) {
      return promise.reject(new Error('maximum manual refresh threshold reached!'));
    }
    let at = '';
    return this.getAccessToken()
      .then((result) => {
        at = result.access_token;
        return this.getWechatTicket(at);
      })
      .catch((reason) => {
        debug('get new global token failed!');
        return promise.reject(reason);
      })
      .then((ticketResult) => {
        return this.updateAccessTokenOrTicketGlobally(at, ticketResult.ticket);
      })
      .catch((ticketReason) => {
        debug('get new global ticket failed!');
        return promise.reject(ticketReason);
      });
  }

  /**
   * get or generate global token info for signature generating process
   */
  prepareNewSignature () {
    let _gt = cache.globalToken;
    if(!_gt || !_gt.accessToken || isTokenExpired(_gt.modifyDate)) {
      debug('get new global ticket');
      return this.getNewTokenAndTicket(true);
    } else{
      debug('global ticket exists');
      return promise.resolve(cache.globalToken);
    }
  }

  /**
   * create NonceStr when gen the signature
   * @returns {string}
   */
  static createNonceStr () {
    return Math.random().toString(36).substr(2, 15);
  }

  /**
   * generate the url signature with the provided info
   * @param ticket, js tocket
   * @param url, current url
   * @param accessToken
   * @returns {{jsapi_ticket: *, nonceStr: string, timestamp: string, url: *}}
   */
  genSignature (ticket, url, accessToken) {
    const ret = {
      jsapi_ticket: ticket,
      nonceStr: JSSDK.createNonceStr(),
      timestamp: parseInt(new Date().getTime() / 1000) + '',
      url: url,
    };
    const s = util.paramsToString(ret);
    ret.signature = util.genSHA1(s);
    ret.accessToken = accessToken;
    return ret;
  }

  /**
   * save or update the signature
   * @param info
   */
  saveNewSignature (info) {
    const signature = Object.assign({}, info);
    signature.createDate = new Date;
    signature.modifyDate = signature.createDate;
    if(cache.urls.hasOwnProperty(signature.signatureName)) {
      debug('Wechat url signature existed, try updating the signature...');
      return promise.reject(info);
    } else {
      cache.urls[signature.signatureName] = signature;
      debug('create wechat signature finished');
      return promise.resolve(info);
    }
  }

  /**
   * update the signature by existing url
   * @param url
   * @param info
   */
  updateSignatureByUrl (url, info) {
    info.modifyDate = new Date;
    delete info.url; //prevent changing the original url
    Object.assign(cache.urls[url], info);
    debug('update wechat signature finished');
    return promise.resolve(info);
  }

  /**
   * get the signature from cache or create a new one
   * @param url
   * @param forceNewSignature
   * @returns {*}
   */
  getSignatureByURL (url, forceNewSignature) {
    let signature = cache.urls[url];
    if(!forceNewSignature && signature && !isTokenExpired(signature.modifyDate)) {
      signature = JSSDK.signatureResult(signature);
      return promise.resolve(signature);
    }
    return this.createNewSignature(url);
  }

  /**
   * get global token info
   * @returns {cache.globalToken|{count}}
   */
  getGlobalWechatInfo () {
    return cache.globalToken;
  }

  /**
   * filter the signature for the client
   * @param reply
   * @returns {*}
   */
  static signatureResult (reply) {
    if(!reply) {
      return {};
    }
    delete reply._id;
    return {
      timestamp: reply.timestamp,
      nonceStr: reply.nonceStr,
      signature: reply.signature,
      url: reply.url,
    };
  }

  /**
   * create a new signature now
   * @param url
   */
  createNewSignature (url) {
    return this.prepareNewSignature()
      .then((data) => {
        const ret = this.genSignature(data.jsapi_ticket, url, data.accessToken);
        ret.signatureName = url;
        return this.saveNewSignature(ret);
      })
      .then((newSignature) => {
        return JSSDK.signatureResult(newSignature);
      })
      .catch(reason => this.updateSignatureByUrl(url, reason))
      .then(sig => JSSDK.signatureResult(sig))
      ;
  }

  /**
   * just get url signature from cache
   * @param url
   * @returns {{}|{timestamp, nonceStr, signature, url}}
   */
  getTokenFromCache (url) {
    return JSSDK.signatureResult(cache.urls[url]);
  }

  getCachedWechatInfo () {
    return cache;
  }
  getCachedGlobalToken () {
    return cache.globalToken;
  }
  getCachedUrlSignature () {
    return cache.urls;
  }

  isTokenExpired (modifyDate) {
    return Date.now() - new Date(modifyDate).getTime() > this.REFRESH_INTERVAL;
  }
}

module.exports = JSSDK;