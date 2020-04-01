'use strict';

const debug = require('debug')('wechat-OAuth');

const qs = require('querystring');
const isEmpty = require('lodash.isempty');

const utils = require('./utils');
const config = require('./config');

const Store = require('./store/Store');
const FileStore = require('./store/FileStore');

const wxConfig = config.getDefaultConfiguration();

const REDIRECT_HASH = '#wechat_redirect';
const oauthScope = {
  BASE: 'snsapi_base',
  USER_INFO: 'snsapi_userinfo',
};

const oAuthDefaultParams = {
  redirect_uri: '',
  response_type: 'code',
};

class OAuth {
  /**
   * OAuth class
   * @constructor
   * @param {object=} options
   * @return {OAuth} OAuth instance
   */
  constructor(options) {
    config.checkPassedConfiguration(options);

    this.wechatConfig = isEmpty(options)
      ? /* istanbul ignore next  */ wxConfig
      : Object.assign({}, wxConfig, options);

    this.oAuthUrl = this.wechatConfig.oAuthUrl + '?';

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
  async getUserInfoRemotely(tokenInfo, withToken) {
    try {
      let data = await utils.sendWechatRequest('/sns/userinfo', {
        prefixUrl: this.wechatConfig.apiUrl,
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
  static setAccessTokenExpirationTime(tokenInfo) {
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
  generateOAuthUrl(redirectUrl, scope, state) {
    let url = this.oAuthUrl;
    const tempObj = {
      appid: this.wechatConfig.appId,
    };
    const oauthState = state || this.wechatConfig.oAuthState || 'userAuth';
    const tempOAuthParams = Object.assign(tempObj, oAuthDefaultParams, {
      redirect_uri: redirectUrl,
      state: oauthState,
    });
    tempOAuthParams.scope = scope
      ? scope
      : /* istanbul ignore next  */ oauthScope.USER_INFO;

    const keys = Object.keys(tempOAuthParams);
    //sort the keys for correct order on url query
    keys.sort();
    const oauthParams = {};
    keys.forEach((key) => (oauthParams[key] = tempOAuthParams[key]));

    url += qs.stringify(oauthParams);
    url += REDIRECT_HASH;
    return url;
  }

  /**
   * Get wechat user base info, aka, get openid and token
   * @param {*} code code included in the redirect url
   * @param {string} [key] key to store the oauth token
   * @return {Promise}
   */
  async getUserBaseInfo(code, key) {
    return this.getAccessToken(code, key);
  }

  /**
   * Get wechat user info, including nickname, openid, avatar, etc...
   * @param {*} code
   * @param {string} [key] key to store oauth token
   * @param {boolean} [withToken] return token info together with the profile
   * @return {Promise}
   */
  async getUserInfo(code, key, withToken) {
    let tokenInfo = await this.getAccessToken(code, key);
    return this.getUserInfoRemotely(tokenInfo, withToken);
  }

  /**
   * Get oauth access token
   * @param {*} code
   * @param {string} key custom user session id to identify cached token
   * @return {Promise}
   */
  async getAccessToken(code, key) {
    if (code) {
      return this.getAccessTokenRemotely(code, key);
    }
    let tokenInfo = await this.store.getOAuthAccessToken(key);
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
  async getAccessTokenRemotely(code, key) {
    debug('getting new oauth access token...');
    try {
      let data = await utils.sendWechatRequest('/sns/oauth2/access_token', {
        prefixUrl: this.wechatConfig.apiUrl,
        searchParams: {
          appid: this.wechatConfig.appId,
          secret: this.wechatConfig.appSecret,
          code: code,
          grant_type: 'authorization_code',
        },
      });
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
  async refreshAccessToken(key, tokenInfo) {
    try {
      let data = await utils.sendWechatRequest('/sns/oauth2/refresh_token', {
        prefixUrl: this.wechatConfig.apiUrl,
        searchParams: {
          appid: this.wechatConfig.appId,
          refresh_token: tokenInfo.refresh_token,
          grant_type: 'refresh_token',
        },
      });
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
  async isAccessTokenValid(tokenInfo) {
    return utils.sendWechatRequest('/sns/auth', {
      prefixUrl: this.wechatConfig.apiUrl,
      searchParams: {
        appid: this.wechatConfig.appId,
        access_token: tokenInfo.access_token,
      },
    });
  }

  /**
   * Set default wechat oauth url for the instance
   */
  setDefaultOAuthUrl() {
    let temp = this.wechatConfig.wechatRedirectUrl;
    /* istanbul ignore else  */
    if (!temp) {
      temp = this.wechatConfig.wechatRedirectHost + '/wechat/oauth-callback';
    }
    this.snsUserInfoUrl = this.generateOAuthUrl(temp, oauthScope.USER_INFO);
    this.snsUserBaseUrl = this.generateOAuthUrl(temp, oauthScope.BASE);
  }

  /**
   * Check if cached token is expired
   * @param {object} tokenInfo
   * @return {boolean}
   */
  static isAccessTokenExpired(tokenInfo) {
    if (!tokenInfo.expirationTime) return true;
    return Date.now() - tokenInfo.expirationTime >= 0;
  }
}

module.exports = OAuth;
