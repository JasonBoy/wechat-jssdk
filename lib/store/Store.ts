import debugFnc from 'debug';
import { EventEmitter } from 'events';
import { StoreOptions } from './StoreOptions';

const debug = debugFnc('wechat-Store');

export const STORE_EVENTS = {
  FLUSH_STORE: 'FLUSH_STORE',
  STORE_FLUSHED: 'STORE_FLUSHED',
  DESTROYED: 'DESTROYED',
  DESTROY: 'DESTROY',
};

export interface StoreGlobalTokenItem {
  count?: number;
  modifyDate?: string | Date;
  accessToken?: string;
  jsapi_ticket?: string;
}
export interface StoreUrlSignatureItem {
  _id?: string | undefined;
  __v?: number | undefined;
  appId?: string;
  jsapi_ticket?: string;
  nonceStr: string;
  timestamp: string;
  url: string;
  signature?: string;
  accessToken?: string;
  signatureName?: string;
  createDate?: string | Date;
  modifyDate?: string | Date;
  updated?: boolean;
}
export interface StoreOAuthItem {
  _id?: string | undefined;
  __v?: number | undefined;
  key?: string;
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  openid?: string;
  scope: string;
  expirationTime: number;
  createDate?: string | Date;
  modifyDate?: string | Date;
  updated?: boolean;
}
export interface StoreCardItem {
  ticket?: string;
  expires_in?: number;
  errcode?: number | string;
  errmsg?: string;
  createDate?: string | Date;
  modifyDate?: string | Date;
}
export interface StoreMiniProgramItem {
  openid?: string;
  session_key?: string;
  unionid?: string;
  expires_in?: number;
  createDate?: string | Date;
  modifyDate?: string | Date;
}

export interface UrlSignaturesCollection {
  [urlAsKey: string]: StoreUrlSignatureItem;
}
export interface OAuthSignaturesCollection {
  [openIdAsKey: string]: StoreOAuthItem;
}
export interface MiniProgramSignaturesCollection {
  [openIdAsKey: string]: StoreMiniProgramItem;
}

export interface StoreInterface {
  wechatConfig: {
    store?: string; //store file path
  };
  globalToken: StoreGlobalTokenItem;
  urls: UrlSignaturesCollection;
  oauth: OAuthSignaturesCollection;
  card: StoreCardItem;
  mp: MiniProgramSignaturesCollection;
}

/**
 * Store class constructor
 * @param options
 * @constructor
 */
class Store extends EventEmitter {
  cache: boolean;
  store: StoreInterface;
  wechatInterval: NodeJS.Timeout;

  constructor(options: StoreOptions = {}) {
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

    this.on(STORE_EVENTS.FLUSH_STORE, this.flush);
    this.on(STORE_EVENTS.DESTROY, this.destroy);

    /* istanbul ignore else */
    if (!options.noInterval) {
      //store to file every 10 minutes by default
      this.wechatInterval = setInterval(
        /* istanbul ignore next */ () => this.flush(),
        options.interval || 1000 * 60 * 10,
      );
    }
  }

  /**
   * Get global token info
   * @return {Promise}
   */
  async getGlobalToken(): Promise<StoreGlobalTokenItem> {
    return Promise.resolve(this.store.globalToken);
  }

  /**
   * Update the global token info, as if access_token or jsapi_ticket is refreshed
   * @param info new token info should be updated to store
   * @return updated global token info
   */
  async updateGlobalToken(
    info: StoreGlobalTokenItem,
  ): Promise<StoreGlobalTokenItem> {
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
   */
  async getSignature(url: string): Promise<StoreUrlSignatureItem> {
    return Promise.resolve(this.store.urls[url]);
  }

  /**
   * Add signature to store for the new url
   * @param url
   * @param signatureInfo
   */
  async saveSignature(
    url: string,
    signatureInfo: StoreUrlSignatureItem,
  ): Promise<StoreUrlSignatureItem> {
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
  async updateSignature(
    url: string,
    newInfo: StoreUrlSignatureItem,
  ): Promise<StoreUrlSignatureItem> {
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
  async isSignatureExisting(url: string): Promise<boolean> {
    const ret = url in this.store.urls;
    return Promise.resolve(ret);
  }

  /**
   * Get cached oauth access token info for current user
   *        should store openid like in current user session
   * @param key
   */
  async getOAuthAccessToken(key: string): Promise<StoreOAuthItem> {
    return Promise.resolve(this.store.oauth[key]);
  }

  /**
   * Save new oauth access token info
   * @param key
   * @param info user oauth access token info
   */
  async saveOAuthAccessToken(
    key: string,
    info: StoreOAuthItem,
  ): Promise<StoreOAuthItem> {
    this.store.oauth[key] = info;
    return Promise.resolve(info);
  }

  /**
   *
   * @param key
   * @param newInfo
   * @return {Promise}
   */
  async updateOAuthAccessToken(
    key: string,
    newInfo: StoreOAuthItem,
  ): Promise<StoreOAuthItem> {
    newInfo.updated = true;
    const newToken = Object.assign({}, this.store.oauth[key], newInfo);
    this.store.oauth[key] = newToken;
    return Promise.resolve(newToken);
  }

  async getCardTicket(): Promise<StoreCardItem> {
    return Promise.resolve(this.store.card);
  }

  /**
   *
   * @param ticketInfo
   */
  async updateCardTicket(ticketInfo: StoreCardItem): Promise<StoreCardItem> {
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
  async getMiniProgramSessionKey(key: string): Promise<string> {
    const session: StoreMiniProgramItem = this.store.mp[key];
    if (!session) return Promise.resolve(null);
    return Promise.resolve(session.session_key);
  }

  /**
   * Get the session data with the key
   * @param key
   * @return {Promise<object>}
   */

  /* istanbul ignore next: handle by end user */
  async getMiniProgramSession(key: string): Promise<StoreMiniProgramItem> {
    return Promise.resolve(this.store.mp[key]);
  }

  /**
   * Set the session associated with the key
   * @param {string} key - object key for the session, default openid
   * @param {object} data - session data
   * @return {Promise<object>} - resolved with old session data
   */

  /* istanbul ignore next: handle by end user */
  async setMiniProgramSession(
    key: string,
    data: StoreMiniProgramItem,
  ): Promise<StoreMiniProgramItem> {
    /* istanbul ignore if */
    if (!key) {
      throw new Error('missing key for the session!');
    }
    const oldSession: StoreMiniProgramItem = this.store.mp[key];
    this.store.mp[key] = data;
    return Promise.resolve(oldSession);
  }

  /**
   * Flush cached store object to persistent storage, e.g Database, File, etc...
   */
  async flush(): Promise<void> {
    // this.emit(STORE_EVENTS.STORE_FLUSHED, true);
    // debug('flushed on Store class');
  }

  /**
   * Destroy the Store instance
   */
  destroy() {
    clearInterval(this.wechatInterval);
    this.store = null;
    // this.emit(STORE_EVENTS.DESTROYED, true);
  }

  /**
   * Clear all old store information, e.g:
   * Rewrite file or empty related db
   */
  clearStore() {}
}

export default Store;
