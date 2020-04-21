import debugFnc from 'debug';
import { stringify } from 'querystring';
import isEmpty from 'lodash.isempty';
import * as utils from './utils';
import { getDefaultConfiguration, checkPassedConfiguration } from './config';

import Store, { StoreOAuthItem } from './store/Store';
import FileStore from './store/FileStore';
import { WeChatOptions } from './WeChatOptions';

const debug = debugFnc('wechat-OAuth');

const wxConfig = getDefaultConfiguration();

const REDIRECT_HASH = '#wechat_redirect';
const oauthScope = {
  BASE: 'snsapi_base',
  USER_INFO: 'snsapi_userinfo',
};

const oAuthDefaultParams = {
  redirect_uri: '',
  response_type: 'code',
};

/**
 * OAuth class
 * @return {OAuth} OAuth instance
 */
class OAuth {
  options: WeChatOptions;
  oAuthUrl: string;
  store: Store;
  snsUserInfoUrl: string;
  snsUserBaseUrl: string;
  constructor(options?: WeChatOptions) {
    checkPassedConfiguration(options);

    this.options = isEmpty(options)
      ? /* istanbul ignore next  */ { ...wxConfig }
      : { ...wxConfig, ...options };

    this.oAuthUrl = this.options.oAuthUrl + '?';

    this.setDefaultOAuthUrl();

    //no custom store provided, using default FileStore
    /* istanbul ignore if  */
    if (!options.store || !(options.store instanceof Store)) {
      debug('[OAuth]Store not provided, using default FileStore...');
      this.store = new FileStore(options.storeOptions);
    } else {
      this.store = options.store;
    }
  }

  /**
   * Get wechat user profile based on the access token
   * @param {object} tokenInfo access token info received based on the code(passed by the wechat server to the redirect_uri)
   * @param {boolean=} withToken if true, the access token info will be merged to the resolved user profile object
   * @return {Promise}
   */
  async getUserInfoRemotely(tokenInfo, withToken): Promise<object> {
    try {
      const data = await utils.sendWechatRequest('/sns/userinfo', {
        prefixUrl: this.options.apiUrl,
        searchParams: {
          access_token: tokenInfo.access_token,
          openid: tokenInfo.openid,
          lang: 'zh_CN',
        },
      });
      debug('user info received');
      return withToken ? Object.assign({}, tokenInfo, data) : data;
    } catch (reason) {
      debug('get user info failed!');
      return Promise.reject(reason);
    }
  }

  /**
   * Set the expire time starting from now for the cached access token
   * @param {object} tokenInfo
   * @static
   * @return {object} tokenInfo updated token info
   */
  static setAccessTokenExpirationTime(tokenInfo): object {
    if (!tokenInfo.expires_in) return tokenInfo;
    const now = Date.now();
    tokenInfo.expirationTime = now + (tokenInfo.expires_in - 60) * 1000; //minus 60s to expire
    return tokenInfo;
  }

  /**
   * Generate redirect url for use wechat oauth page
   * @param {string} redirectUrl
   * @param {string=} scope pass custom scope
   * @param {string=} state pass custom state
   * @return {string} generated oauth uri
   */
  generateOAuthUrl(redirectUrl, scope?: string, state?: string): string {
    let url = this.oAuthUrl;
    const tempObj = {
      appid: this.options.appId,
      scope: oauthScope.USER_INFO,
    };
    const oauthState = state || this.options.oAuthState || 'userAuth';
    const tempOAuthParams = Object.assign(tempObj, oAuthDefaultParams, {
      redirect_uri: redirectUrl,
      state: oauthState,
    });
    if (scope) {
      tempOAuthParams.scope = scope;
    }

    const keys = Object.keys(tempOAuthParams);
    //sort the keys for correct order on url query
    keys.sort();
    const oauthParams = {};
    keys.forEach((key) => (oauthParams[key] = tempOAuthParams[key]));

    url += stringify(oauthParams);
    url += REDIRECT_HASH;
    return url;
  }

  /**
   * Get wechat user base info, aka, get openid and token
   * @param {*} code code included in the redirect url
   * @param {string} [key] key to store the oauth token
   * @return {Promise}
   */
  async getUserBaseInfo(code, key): Promise<object> {
    return this.getAccessToken(code, key);
  }

  /**
   * Get wechat user info, including nickname, openid, avatar, etc...
   * @param {*} code
   * @param {string} [key] key to store oauth token
   * @param {boolean} [withToken] return token info together with the profile
   * @return {Promise}
   */
  async getUserInfo(code, key, withToken): Promise<object> {
    const tokenInfo = await this.getAccessToken(code, key);
    return this.getUserInfoRemotely(tokenInfo, withToken);
  }

  /**
   * Get oauth access token
   * @param {*} code
   * @param {string} key custom user session id to identify cached token
   * @return {Promise}
   */
  async getAccessToken(code, key): Promise<object> {
    if (code) {
      return this.getAccessTokenRemotely(code, key);
    }
    const tokenInfo = await this.store.getOAuthAccessToken(key);
    if (!tokenInfo) {
      const err = new Error('please get new code!');
      debug(err);
      return Promise.reject(err);
    }
    if (OAuth.isAccessTokenExpired(tokenInfo)) {
      return this.refreshAccessToken(key, tokenInfo);
    }
    return Promise.resolve(tokenInfo);
  }

  /**
   * Get access token from wechat server
   * @param {*} code
   * @param {string} key
   * @return {Promise}
   */
  async getAccessTokenRemotely(code, key): Promise<object> {
    debug('getting new oauth access token...');
    try {
      const data = (await utils.sendWechatRequest('/sns/oauth2/access_token', {
        prefixUrl: this.options.apiUrl,
        searchParams: {
          appid: this.options.appId,
          secret: this.options.appSecret,
          code: code,
          grant_type: 'authorization_code',
        },
      })) as StoreOAuthItem;
      OAuth.setAccessTokenExpirationTime(data);
      const oauthKey = key || data.openid;
      data.key = oauthKey;
      data.createDate = new Date();
      data.modifyDate = data.createDate;
      return await this.store.saveOAuthAccessToken(oauthKey, data);
    } catch (reason) {
      debug('get oauth access token failed!');
      return Promise.reject(reason);
    }
  }

  /**
   * Refresh access token with the cached refresh_token over the wechat server
   * @param {string} key
   * @param {object} tokenInfo
   * @return {Promise}
   */
  async refreshAccessToken(key, tokenInfo): Promise<object> {
    try {
      const data = (await utils.sendWechatRequest('/sns/oauth2/refresh_token', {
        prefixUrl: this.options.apiUrl,
        searchParams: {
          appid: this.options.appId,
          refresh_token: tokenInfo.refresh_token,
          grant_type: 'refresh_token',
        },
      })) as StoreOAuthItem;
      OAuth.setAccessTokenExpirationTime(data);
      const oauthKey = key || data.openid;
      data.modifyDate = new Date();
      return await this.store.updateOAuthAccessToken(oauthKey, data);
    } catch (err) {
      debug('please get the new code!');
      return Promise.reject(err);
    }
  }

  /**
   * Check if cached token is valid over the wechat server
   * @param {object} tokenInfo
   * @return {Promise}
   */
  async isAccessTokenValid(tokenInfo): Promise<object> {
    return utils.sendWechatRequest('/sns/auth', {
      prefixUrl: this.options.apiUrl,
      searchParams: {
        appid: this.options.appId,
        access_token: tokenInfo.access_token,
      },
    });
  }

  /**
   * Set default wechat oauth url for the instance
   */
  setDefaultOAuthUrl(): void {
    let temp = this.options.wechatRedirectUrl;
    /* istanbul ignore else  */
    if (!temp) {
      temp = this.options.wechatRedirectHost + '/wechat/oauth-callback';
    }
    this.snsUserInfoUrl = this.generateOAuthUrl(temp, oauthScope.USER_INFO);
    this.snsUserBaseUrl = this.generateOAuthUrl(temp, oauthScope.BASE);
  }

  /**
   * Check if cached token is expired
   * @param {object} tokenInfo
   * @return {boolean}
   */
  static isAccessTokenExpired(tokenInfo): boolean {
    if (!tokenInfo.expirationTime) return true;
    return Date.now() - tokenInfo.expirationTime >= 0;
  }
}

export default OAuth;
