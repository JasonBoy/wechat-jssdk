const debug = require('debug')('wechat');
const Promise = require('bluebird');
const qs = require("querystring");
const _ = require('lodash');

const util = require('./utils');
const config = require('./config');
const cache = require('./cache');

const wxConfig = config.getConfiguration();

const REDIRECT_HASH = '#wechat_redirect';

const oAuthDefaultParams = {
  redirect_uri: '',
  response_type: 'code',
  scope: 'snsapi_userinfo',
};


class OAuth {

  /**
   * OAuth class
   * @constructor
   * @param {object=} config
   * @return {OAuth} OAuth instance
   */
  constructor (config) {
    if (!new.target) return new OAuth(config);

    /**
     *
     * {
     *   "access_token":"ACCESS_TOKEN",
     *   "expires_in":7200,
     *   "refresh_token":"REFRESH_TOKEN",
     *   "openid":"OPENID",
     *   "scope":"SCOPE",
     *   "unionid": "o6_bmasdasdsad6_2sgVt7hMZOPfL"
     * }
     * @type {object}
     */
    this.oauthAccessToken = {};

    this.wechatConfig = _.isEmpty(config) ? wxConfig : Object.assign({}, wxConfig, config);

    this.oAuthUrl = this.wechatConfig.oAuthUrl + '?';

    setInterval(() => this.refreshAccessToken(), 1000 * 60 * 158);
  }

  /**
   * Get wechat user profile based on the access token
   * @param {object} tokenInfo access token info received based on the code(passed by the wechat server to the redirect_uri)
   * @param {boolean=} withToken if true, the access token info will be merged to the resolved user profile object
   * @return {Promise}
   */
  static getUserInfoWithToken (tokenInfo, withToken) {
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
  static setExpirationTime (tokenInfo) {
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
  generateOauthUrl (myRedirectUrl, baseInfo) {
    let url = this.oAuthUrl;
    const tempObj = {
      appid: this.wechatConfig.appId,
    };
    const oauthState = this.wechatConfig.oAuthState || 'userAuth';
    const tempOAuthParams = Object.assign(tempObj, oAuthDefaultParams, {
      redirect_uri: myRedirectUrl,
      state: oauthState,
    });
    tempOAuthParams.scope = baseInfo ? 'snsapi_base' : 'snsapi_userinfo';

    url += qs.stringify(tempOAuthParams);
    url += REDIRECT_HASH;
    return url;
  }

  /**
   * get wechat user base info
   * @param code code included in the redirect url
   */
  getUserBaseInfo (code) {
    return this.getOAuthAccessToken(code).then(data => data);
  }

  /**
   * get wechat user info, including nickname, openid, avatar, etc...
   * @param code
   * @param withToken return token info together with the profile
   * @return {Promise}
   */
  getUserInfo (code, withToken) {
    return this.getOAuthAccessToken(code)
      .then((tokenInfo) => {
        return OAuth.getUserInfoWithToken(tokenInfo, withToken);
      });
  }

  /**
   * {
   *   code: '', // code query from wechat redirect
   *   returnToken: false, //if token info should be returned together with user profile
   * }
   * @param {object} options
   */
  getUserInfoByOptions (options={}) {
    return this.getUserInfo(options.code, options.returnToken);
  }

  /**
   * Get oauth access token
   * @param {string} code
   * @return {Promise}
   */
  getOAuthAccessToken (code) {
    if(!code) {
      return Promise.reject(new Error('"code" not specified!'));
    }
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
        OAuth.setExpirationTime(this.oauthAccessToken);
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
        OAuth.setExpirationTime(this.oauthAccessToken);
        return data;
      })
      .catch(() => {
        debug('please get the new code!');
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
      })
      .then(data => data);
  }

  /**
   * Get cached access token info
   * @return {Object}
   */
  getCachedTokenInfo () {
    return this.oauthAccessToken;
  }

  /**
   * Set default wechat oauth url for the instance
   */
  setDefaultOauthUrl () {
    let temp = this.wechatConfig.wechatRedirectUrl;
    if (!temp) {
      temp = this.wechatConfig.wechatRedirectHost + '/wechat/oauth-callback';
    }
    this.snsUserInfoUrl = this.generateOauthUrl(temp);
    this.snsUserBaseUrl = this.generateOauthUrl(temp, true);
  }

  /**
   * Check if cached token is expired
   * @return {boolean}
   */
  isTokenExpired () {
    if(!this.oauthAccessToken.expirationTime) return true;
    return Date.now() - this.oauthAccessToken.expirationTime >= 0;
  }

}

module.exports = OAuth;