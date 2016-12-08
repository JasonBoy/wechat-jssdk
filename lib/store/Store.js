const debug = require('debug')('wechat');
const fs = require('fs');
const path = require('path');
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
   * @constructor
   */
  constructor (options = {}) {
    super();

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
     * }
     *
     */
    this.store = {
      globalToken: {
        count: 0,
      },
      urls: {},
    };

    this.on(storeEvents.FLUSH_STORE, this.flushStore);
    this.on(storeEvents.DESTROY, this.destroy);

    if(!options.noInterval) {
      //store to file every 10 minutes by default
      this.wechatInterval = setInterval(() => this.flushStore(), options.interval || 1000 * 60 * 10);
    }
  }

  static get StoreEvents () {
    return storeEvents;
  }

  /**
   * Get global token info
   * @return {Promise}
   */
  getGlobalTokenInfo () {
    return Promise.resolve(this.store.globalToken);
  }

  /**
   * Update the global token info, as if access_token or jsapi_ticket is refreshed
   * @param info new token info should be updated to store
   * @return {Promise} updated global token info
   */
  updateGlobalTokenInfo (info) {
    const newToken = Object.assign(this.store.globalToken, info);
    newToken.count++;
    debug('Access Token or jsapi ticket updated');
    return Promise.resolve(newToken);
  }

  /**
   * Get signature for passed url from store
   * @param url
   * @return {Promise}
   */
  getCachedSignatureByUrl (url) {
    return Promise.resolve(this.store.urls[url]);
  }

  /**
   * Add signature to store for the new url
   * @param url
   * @param signatureInfo
   * @return {Promise}
   */
  setNewSignature (url, signatureInfo) {
    this.store.urls[url] = signatureInfo;
    return Promise.resolve(signatureInfo);
  }

  /**
   * Update url signature to store
   * @param url
   * @param newInfo
   * @return {Promise}
   */
  updateSignature (url, newInfo) {
    const newSig = Object.assign(this.store.urls[url], newInfo);
    return Promise.resolve(newSig);
  }

  /**
   * Check if signature of the url is existing in store
   * @param url
   * @return {Promise}
   */
  isSignatureExisted (url) {
    const ret = this.store.urls.hasOwnProperty(url);
    return Promise.resolve(ret);
  }

  /**
   * Flush cached store object to persistent storage, e.g Database, File, etc...
   */
  flushStore () {
    this.emit(storeEvents.STORE_FLUSHED);
  }

  /**
   * Destroy the Store instance
   */
  destroy () {
    clearInterval(this.wechatInterval);
    this.store = null;
    this.emit(storeEvents.DESTROYED);
  }
}

module.exports = Store;