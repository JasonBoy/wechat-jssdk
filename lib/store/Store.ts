import debugFnc from 'debug';
import { EventEmitter } from 'events';

const debug = debugFnc('wechat-Store');

const storeEvents = {
  FLUSH_STORE: 'FLUSH_STORE',
  STORE_FLUSHED: 'STORE_FLUSHED',
  DESTROYED: 'DESTROYED',
  DESTROY: 'DESTROY',
};

class Store extends EventEmitter {
  cache: boolean;
  store: object;
  wechatInterval: NodeJS.Timeout;
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
     *   //mini program info
     *   mp: {
     *     openid_as_key: {
     *       openid: "OPENID",
     *       session_key: "SESSIONKEY",
     *       unionid: "UNIONID", //optional
     *     },
     *     ...
     *   }
     * }
     *
     */
    this.store = {
      wechatConfig: {},
      globalToken: {
        count: 0,
      },
      urls: {},
      oauth: {},
      card: {},
      mp: {},
    };

    this.on(storeEvents.FLUSH_STORE, this.flush);
    this.on(storeEvents.DESTROY, this.destroy);

    /* istanbul ignore else */
    if (!options.noInterval) {
      //store to file every 10 minutes by default
      this.wechatInterval = setInterval(
        /* istanbul ignore next */ () => this.flush(),
        options.interval || 1000 * 60 * 10,
      );
    }
  }

  /* istanbul ignore next */
  static get StoreEvents(): object {
    return storeEvents;
  }

  /**
   * Get global token info
   * @return {Promise}
   */
  async getGlobalToken(): Promise<object> {
    return Promise.resolve(this.store.globalToken);
  }

  /**
   * Update the global token info, as if access_token or jsapi_ticket is refreshed
   * @param info new token info should be updated to store
   * @return {Promise} updated global token info
   */
  async updateGlobalToken(info): Promise<object> {
    const newToken = Object.assign({}, this.store.globalToken, info);
    // console.log('new token: ', newToken);
    newToken.count++;
    this.store.globalToken = newToken;
    await this.flush();
    debug('Access Token or jsapi ticket updated');
    return Promise.resolve(newToken);
  }

  /**
   * Get signature for passed url from store
   * @param url
   * @return {Promise}
   */
  async getSignature(url): Promise<object> {
    return Promise.resolve(this.store.urls[url]);
  }

  /**
   * Add signature to store for the new url
   * @param url
   * @param signatureInfo
   * @return {Promise}
   */
  async saveSignature(url, signatureInfo): Promise<object> {
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
  async updateSignature(url, newInfo): Promise<object> {
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
  async isSignatureExisting(url): Promise<boolean> {
    const ret = url in this.store.urls;
    return Promise.resolve(ret);
  }

  /**
   * Get cached oauth access token info for current user
   *        should store openid like in current user session
   * @param key
   * @return {Promise}
   */
  async getOAuthAccessToken(key): Promise<object> {
    return Promise.resolve(this.store.oauth[key]);
  }

  /**
   * Save new oauth access token info
   * @param key
   * @param info user oauth access token info
   * @return {Promise}
   */
  async saveOAuthAccessToken(key, info): Promise<object> {
    this.store.oauth[key] = info;
    return Promise.resolve(info);
  }

  /**
   *
   * @param key
   * @param newInfo
   * @return {Promise}
   */
  async updateOAuthAccessToken(key, newInfo): Promise<object> {
    newInfo.updated = true;
    const newToken = Object.assign({}, this.store.oauth[key], newInfo);
    this.store.oauth[key] = newToken;
    return Promise.resolve(newToken);
  }

  async getCardTicket(): Promise<object> {
    return Promise.resolve(this.store.card);
  }

  /**
   *
   * @param ticketInfo
   * @return {Promise}
   */
  async updateCardTicket(ticketInfo): Promise<object> {
    const newTicket = (this.store.card = Object.assign(
      {},
      this.store.card,
      ticketInfo,
    ));
    return Promise.resolve(newTicket);
  }

  /**
   * Get mini program session_ket
   * @param key - object key for the session, default openid
   * @return {Promise<string>}
   */

  /* istanbul ignore next: handle by end user */
  async getMPSessionKey(key): Promise<string> {
    const session = this.store.mp[key] || {};
    return Promise.resolve(session.session_key);
  }

  /**
   * Get the session data with the key
   * @param key
   * @return {Promise<object>}
   */

  /* istanbul ignore next: handle by end user */
  async getMPSession(key): Promise<object> {
    return Promise.resolve(this.store.mp[key]);
  }

  /**
   * Set the session associated with the key
   * @param {string} key - object key for the session, default openid
   * @param {object} data - session data
   * @return {Promise<object>} - resolved with old session data
   */

  /* istanbul ignore next: handle by end user */
  async setMPSession(key, data): Promise<object> {
    /* istanbul ignore if */
    if (!key) {
      return Promise.reject(new Error('missing key for the session!'));
    }
    const oldSession = this.store.mp[key];
    this.store.mp[key] = data;
    return Promise.resolve(oldSession);
  }

  /**
   * Flush cached store object to persistent storage, e.g Database, File, etc...
   */
  async flush() {
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

  /**
   * Clear all old store information, e.g:
   * Rewrite file or empty related db
   */
  clearStore() {}
}

export default Store;
