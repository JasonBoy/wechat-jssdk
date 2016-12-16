const debug = require('debug')('wechat');
const Promise = require('bluebird');
const qs = require("querystring");
const _ = require('lodash');

const util = require('./utils');
const config = require('./config');

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
    /**
     *
     * {
     *   "access_token":"ACCESS_TOKEN",
     *   "expires_in":7200,
     *   "refresh_token":"REFRESH_TOKEN",
     *   "openid":"OPENID",
     *   "scope":"SCOPE",
     * }
     * @type {object}
     */
    this.oauthAccessToken = {};

    this.wechatConfig = _.isEmpty(options) ? wxConfig : Object.assign({}, wxConfig, options);

    this.oAuthUrl = this.wechatConfig.oAuthUrl + '?';

    this.setDefaultOAuthUrl();

    setInterval(() => this.refreshAccessToken()
      , options.refreshAccessTokenInterval || 1000 * 60 * 158);
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
   * Get wechat user base info
   * @param code code included in the redirect url
   */
  getUserBaseInfo (code) {
    return this.getAccessToken(code).then(data => data);
  }

  /**
   * Get wechat user info, including nickname, openid, avatar, etc...
   * @param code
   * @param withToken return token info together with the profile
   * @return {Promise}
   */
  getUserInfo (code, withToken) {
    return this.getAccessToken(code)
      .then((tokenInfo) => {
        return this.getUserInfoRemotely(tokenInfo, withToken);
      })
      .catch((reason) => {
        return Promise.reject(reason);
      })
      ;
  }

  /**
   * Get oauth access token
   * @param {string} code
   * @return {Promise}
   */
  getAccessToken (code) {
    if(!code) {
      return Promise.reject(new Error('"code" not specified!'));
    }
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
        this.oauthAccessToken = data;
        OAuth.setAccessTokenExpirationTime(this.oauthAccessToken);
        return data;
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
  refreshAccessToken () {
    return util.sendWechatRequest({
        url: '/sns/oauth2/refresh_token',
        baseUrl: this.wechatConfig.apiUrl,
        qs: {
          appid: this.wechatConfig.appId,
          refresh_token: this.oauthAccessToken.refresh_token,
          grant_type: 'refresh_token',
        },
      })
      .then((data) => {
        this.oauthAccessToken = data;
        OAuth.setAccessTokenExpirationTime(this.oauthAccessToken);
        return data;
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
  isAccessTokenValid () {
    return util.sendWechatRequest({
        url: '/sns/auth',
        baseUrl: this.wechatConfig.apiUrl,
        qs: {
          appid: this.wechatConfig.appId,
          access_token: this.oauthAccessToken.access_token,
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
   * @return {boolean}
   */
  isAccessTokenExpired () {
    if(!this.oauthAccessToken.expirationTime) return true;
    return Date.now() - this.oauthAccessToken.expirationTime >= 0;
  }

}

module.exports = OAuth;