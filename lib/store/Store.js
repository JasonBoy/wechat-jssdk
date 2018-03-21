'use strict';

const debug = require('debug')('wechat-Store');
const EventEmitter = require('events');

const storeEvents = {
  FLUSH_STORE: 'FLUSH_STORE',
  STORE_FLUSHED: 'STORE_FLUSHED',
  DESTROYED: 'DESTROYED',
  DESTROY: 'DESTROY',
};

class Store extends EventEmitter {
  /**
   * Store class constructor
   * @param options
   * @constructor
   */
  constructor(options) {
    super();

    if (!options) {
      options = {};
    }

    this.cache = true;

    /**
     * Set default empty store object:
     * {
     *   //global token/ticket info
     *   globalToken: {
     *     count: 0,
     *     "modifyDate": "2016-12-01T09:25:43.781Z",
     *     "accessToken": "accessToken",
     *     "jsapi_ticket": "jsapi_ticket"
     *   },
     *   //token/ticket info for every url
     *   urls: {
     *     "http://localhost/": {
     *       "jsapi_ticket": "jsapi_ticket",
     *       "nonceStr": "8iv3478f26vvsz1",
     *       "timestamp": "1480584343",
     *       "url": "http://localhost/",
     *       "signature": "signature",
     *       "accessToken": "accessToken",
     *       "signatureName": "http://localhost/", //same as the url key
     *       "createDate": "2016-12-01T09:25:43.784Z",
     *       "modifyDate": "2016-12-01T09:25:43.784Z"
     *     }
     *   },
     *   //oauth cached token for every user
     *   oauth: {
     *     //key could be openid, or custom key passed by user
     *     "key": {
     *        "key": "unique_identifier",
     *        "access_token":"ACCESS_TOKEN",
     *        "expires_in":7200,
     *        "refresh_token":"REFRESH_TOKEN",
     *        "openid":"OPENID",
     *        "scope":"SCOPE",
     *     }
     *   },
     *   //card api_ticket info
     *   card: {
     *     ticket: "api_ticket",
     *     expires_in: 7200,
     *     modifyDate: "2016-12-01T09:25:43.781Z"
     *   }
     * }
     *
     */
    this.store = {
      globalToken: {
        count: 0,
      },
      urls: Object.create(null),
      oauth: Object.create(null),
      card: Object.create(null),
    };

    this.on(storeEvents.FLUSH_STORE, this.flush);
    this.on(storeEvents.DESTROY, this.destroy);

    if (!options.noInterval) {
      //store to file every 10 minutes by default
      this.wechatInterval = setInterval(
        () => this.flush(),
        options.interval || 1000 * 60 * 10
      );
    }
  }

  static get StoreEvents() {
    return storeEvents;
  }

  /**
   * Get global token info
   * @return {Promise}
   */
  getGlobalToken() {
    return Promise.resolve(this.store.globalToken);
  }

  /**
   * Update the global token info, as if access_token or jsapi_ticket is refreshed
   * @param info new token info should be updated to store
   * @return {Promise} updated global token info
   */
  updateGlobalToken(info) {
    const newToken = Object.assign({}, this.store.globalToken, info);
    console.log('new token: ', newToken);
    newToken.count++;
    this.store.globalToken = newToken;
    this.flush();
    debug('Access Token or jsapi ticket updated');
    return Promise.resolve(newToken);
  }

  /**
   * Get signature for passed url from store
   * @param url
   * @return {Promise}
   */
  getSignature(url) {
    return Promise.resolve(this.store.urls[url]);
  }

  /**
   * Add signature to store for the new url
   * @param url
   * @param signatureInfo
   * @return {Promise}
   */
  saveSignature(url, signatureInfo) {
    signatureInfo.updated = true;
    this.store.urls[url] = signatureInfo;
    return Promise.resolve(signatureInfo);
  }

  /**
   * Update url signature to store
   * @param url
   * @param newInfo
   * @return {Promise}
   */
  updateSignature(url, newInfo) {
    newInfo.updated = true;
    const newSig = Object.assign({}, this.store.urls[url], newInfo);
    this.store.urls[url] = newSig;
    return Promise.resolve(newSig);
  }

  /**
   * Check if signature of the url is existing in store
   * @param url
   * @return {Promise}
   */
  isSignatureExisting(url) {
    const ret = url in this.store.urls;
    return Promise.resolve(ret);
  }

  /**
   * Get cached oauth access token info for current user
   *        should store openid like in current user session
   * @param key
   * @return {Promise}
   */
  getOAuthAccessToken(key) {
    return Promise.resolve(this.store.oauth[key]);
  }

  /**
   * Save new oauth access token info
   * @param key
   * @param info user oauth access token info
   * @return {Promise}
   */
  saveOAuthAccessToken(key, info) {
    this.store.oauth[key] = info;
    return Promise.resolve(info);
  }

  /**
   *
   * @param key
   * @param newInfo
   * @return {Promise}
   */
  updateOAuthAccessToken(key, newInfo) {
    newInfo.updated = true;
    const newToken = Object.assign({}, this.store.oauth[key], newInfo);
    this.store.oauth[key] = newToken;
    return Promise.resolve(newToken);
  }

  getCardTicket() {
    return Promise.resolve(this.store.card);
  }

  /**
   *
   * @param ticketInfo
   * @return {Promise}
   */
  updateCardTicket(ticketInfo) {
    const newTicket = (this.store.card = Object.assign(
      {},
      this.store.card,
      ticketInfo
    ));
    return Promise.resolve(newTicket);
  }

  /**
   * Flush cached store object to persistent storage, e.g Database, File, etc...
   */
  flush() {
    // this.emit(storeEvents.STORE_FLUSHED, true);
    // debug('flushed on Store class');
  }

  /**
   * Destroy the Store instance
   */
  destroy() {
    clearInterval(this.wechatInterval);
    this.store = null;
    // this.emit(storeEvents.DESTROYED, true);
  }
}

module.exports = Store;
