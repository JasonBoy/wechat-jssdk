const debug = require('debug')('wechat');
const fs = require('fs');
const path = require('path');

class Store {

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

  getGlobalTokenInfo () {
    return this.store.globalToken;
  }

  updateGlobalTokenInfo (info) {
    const newToken = Object.assign(this.store.globalToken, info);
    newToken.count++;
    debug('Access Token or jsapi ticket updated');
    return newToken;
  }

  getAllUrlSignature () {
    return this.store.urls;
  }

  getCachedSignatureByUrl (url) {
    return this.store.urls[url];
  }

  setNewSignature (url, signatureInfo) {
    this.store.urls[url] = signatureInfo;
    return this;
  }

  updateSignature (url, newInfo) {
    this.store.urls[url] = Object.assign({}, this.getCachedSignatureByUrl(url), newInfo);
    return this;
  }

  isSignatureExisted (url) {
    return this.store.urls.hasOwnProperty(url);
  }

  flushStore () {

  }

}

module.exports = Store;