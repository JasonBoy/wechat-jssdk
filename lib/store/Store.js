const debug = require('debug')('wechat');
const fs = require('fs');
const path = require('path');

class Store {

  /**
   * Store class constructor
   * @constructor
   */
  constructor () {
    //set default empty store object
    this.store = {
      //global token/ticket info
      globalToken: {
        count: 0,
        // "modifyDate": "2016-12-01T09:25:43.781Z",
        // "accessToken": "accessToken",
        // "jsapi_ticket": "jsapi_ticket"
      },
      //token/ticket info for every url
      urls: {
        // "http://localhost/": {
        //   "jsapi_ticket": "jsapi_ticket",
        //   "nonceStr": "8iv3478f26vvsz1",
        //   "timestamp": "1480584343",
        //   "url": "http://localhost/",
        //   "signature": "signature",
        //   "accessToken": "accessToken",
        //   "signatureName": "http://localhost/", //same as the url key
        //   "createDate": "2016-12-01T09:25:43.784Z",
        //   "modifyDate": "2016-12-01T09:25:43.784Z"
        // }
      },
    };
  }

  /**
   * Get global token info
   * @return {object}
   */
  getGlobalTokenInfo () {
    return this.store.globalToken;
  }

  /**
   * Update the global token info, as if access_token or jsapi_ticket is refreshed
   * @param info new token info should be updated to store
   * @return {object} updated global token info
   */
  updateGlobalTokenInfo (info) {
    const newToken = Object.assign(this.store.globalToken, info);
    newToken.count++;
    debug('Access Token or jsapi ticket updated');
    return newToken;
  }

  /**
   * Get all urls signature from store
   * @return {object}
   */
  getAllUrlSignature () {
    return this.store.urls;
  }

  /**
   * Get signature for passed url from store
   * @param url
   * @return {object}
   */
  getCachedSignatureByUrl (url) {
    return this.store.urls[url];
  }

  /**
   * Add signature to store for the new url
   * @param url
   * @param signatureInfo
   * @return {Store}
   */
  setNewSignature (url, signatureInfo) {
    this.store.urls[url] = signatureInfo;
    return this;
  }

  /**
   * Update url signature to store
   * @param url
   * @param newInfo
   * @return {Store}
   */
  updateSignature (url, newInfo) {
    this.store.urls[url] = Object.assign({}, this.getCachedSignatureByUrl(url), newInfo);
    return this;
  }

  /**
   * Check if signature of the url is existing in store
   * @param url
   * @return {boolean}
   */
  isSignatureExisted (url) {
    return this.store.urls.hasOwnProperty(url);
  }

  /**
   * Flush cached store object to persistent storage, e.g Database, File, etc...
   */
  flushStore () {}

}

module.exports = Store;