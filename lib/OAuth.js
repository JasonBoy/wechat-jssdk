const debug = require('debug')('wechat');
const Promise = require('bluebird');
const qs = require("querystring");
const _ = require('lodash');

const util = require('./utils');
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
  constructor (options) {

    config.checkPassedConfiguration(options);

    this.wechatConfig = _.isEmpty(options) ? wxConfig : Object.assign({}, wxConfig, options);

    this.oAuthUrl = this.wechatConfig.oAuthUrl + '?';

    this.setDefaultOAuthUrl();

    //no custom store provided, using default FileStore
    if(!options.store || !(options.store instanceof Store)) {
      debug('Store not provided, using default FileStore...');
      this.store = new FileStore();
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
  getUserInfoRemotely (tokenInfo, withToken) {
    return util.sendWechatRequest({
        url: '/sns/userinfo',
        baseUrl: this.wechatConfig.apiUrl,
        qs: {
          access_token: tokenInfo.access_token,
          openid: tokenInfo.openid,
          lang: 'zh_CN',
        },
      })
      .then((data) => {
        debug('user info received');
        return withToken ? Object.assign({}, tokenInfo, data) : data;
      })
      .catch((reason) => {
        debug('get user info failed!');
        return Promise.reject(reason);
      });
  }

  /**
   * Set the expire time starting from now for the cached access token
   * @param {object} tokenInfo
   */
  static setAccessTokenExpirationTime (tokenInfo) {
    if(!tokenInfo.expires_in) return;
    const now = Date.now();
    tokenInfo.expirationTime = now + ((tokenInfo.expires_in - 60) * 1000); //minus 60s to expire
    return tokenInfo;
  }

  /**
   * Generate redirect url for use wechat oauth page
   * @param {string} myRedirectUrl
   * @param {boolean=} baseInfo , get base info api, default false which gets userinfo
   * @return {string} generated redirect uri
   */
  generateOAuthUrl (myRedirectUrl, baseInfo) {
    let url = this.oAuthUrl;
    const tempObj = {
      appid: this.wechatConfig.appId,
    };
    const oauthState = this.wechatConfig.oAuthState || 'userAuth';
    const tempOAuthParams = Object.assign(tempObj, oAuthDefaultParams, {
      redirect_uri: myRedirectUrl,
      state: oauthState,
    });
    tempOAuthParams.scope = baseInfo ? oauthScope.BASE : oauthScope.USER_INFO;

    const keys = Object.keys(tempOAuthParams);
    //sort the keys for correct order on url query
    keys.sort();
    const oauthParams = {};
    keys.forEach(key => oauthParams[key] = tempOAuthParams[key]);

    url += qs.stringify(oauthParams);
    url += REDIRECT_HASH;
    return url;
  }

  /**
   * Get wechat user base info, aka, get openid and token
   * @param {*} code code included in the redirect url
   * @param {string} [sid]
   * @param {boolean} [forceNewToken]
   * @return {Promise}
   */
  getUserBaseInfo (code, sid, forceNewToken) {
    return this.getAccessToken(code, sid, forceNewToken)
      .then(data => data);
  }

  /**
   * Get wechat user info, including nickname, openid, avatar, etc...
   * @param {*} code
   * @param {string} [sid] key to store oauth token
   * @param {boolean} [withToken] return token info together with the profile
   * @return {Promise}
   */
  getUserInfo (code, sid, withToken) {
    return this.getAccessToken(code, sid)
      .then((tokenInfo) => {
        return this.getUserInfoRemotely(tokenInfo, withToken);
      });
  }

  /**
   * Get oauth access token
   * @param {string} [code]
   * @param {string} sid custom user session id to identify cached token
   * @return {Promise}
   */
  getAccessToken (code, sid) {
    if(code) {
      return this.getAccessTokenRemotely(code, sid);
    }
    return this.store.getOAuthAccessToken(sid)
      .then((tokenInfo) => {
        //nothing in cache, or token is expired
        if(!tokenInfo) {
          const err = new Error('please get new code!');
          debug(err);
          return Promise.reject(err);
        }
        if(OAuth.isAccessTokenExpired(tokenInfo)) {
          return this.refreshAccessToken(sid, tokenInfo);
        }
        return tokenInfo;
      });
  }

  getAccessTokenRemotely (code, sid) {
    debug('getting new oauth access token...');
    return util.sendWechatRequest({
        url: '/sns/oauth2/access_token',
        baseUrl: this.wechatConfig.apiUrl,
        qs: {
          appid: this.wechatConfig.appId,
          secret: this.wechatConfig.appSecret,
          code: code,
          grant_type: 'authorization_code',
        },
      })
      .then((data) => {
        OAuth.setAccessTokenExpirationTime(data);
        const key = sid || data.openid;
        data.key = key;
        data.createDate = new Date;
        data.modifyDate = data.createDate;
        return this.store.saveOAuthAccessToken(key, data);
      })
      .catch((reason) => {
        debug('get oauth access token failed!');
        return Promise.reject(reason);
      });
  }

  /**
   * Refresh access token with the cached refresh_token over the wechat server
   * @returns {Promise}
   */
  refreshAccessToken (sid, tokenInfo) {
    return util.sendWechatRequest({
        url: '/sns/oauth2/refresh_token',
        baseUrl: this.wechatConfig.apiUrl,
        qs: {
          appid: this.wechatConfig.appId,
          refresh_token: tokenInfo.refresh_token,
          grant_type: 'refresh_token',
        },
      })
      .then((data) => {
        OAuth.setAccessTokenExpirationTime(data);
        const key = sid || data.openid;
        data.modifyDate = new Date;
        return this.store.updateOAuthAccessToken(key, data);
      })
      .catch((err) => {
        debug('please get the new code!');
        return Promise.reject(err);
      });
  }

  /**
   * Check if cached token is valid over the wechat server
   * @return {Promise}
   */
  isAccessTokenValid (tokenInfo) {
    return util.sendWechatRequest({
        url: '/sns/auth',
        baseUrl: this.wechatConfig.apiUrl,
        qs: {
          appid: this.wechatConfig.appId,
          access_token: tokenInfo.access_token,
        },
      });
  }

  /**
   * Set default wechat oauth url for the instance
   */
  setDefaultOAuthUrl () {
    let temp = this.wechatConfig.wechatRedirectUrl;
    if (!temp) {
      temp = this.wechatConfig.wechatRedirectHost + '/wechat/oauth-callback';
    }
    this.snsUserInfoUrl = this.generateOAuthUrl(temp);
    this.snsUserBaseUrl = this.generateOAuthUrl(temp, true);
  }

  /**
   * Check if cached token is expired
   * @param {object} tokenInfo
   * @return {boolean}
   */
  static isAccessTokenExpired (tokenInfo) {
    if(!tokenInfo.expirationTime) return true;
    return Date.now() - tokenInfo.expirationTime >= 0;
  }

}

module.exports = OAuth;