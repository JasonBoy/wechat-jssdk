const debug = require('debug')('wechat');
const promise = require('bluebird');
const qs = require("querystring");

const util = require('./utils');
const config = require('./config');
const cache = require('./cache');

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
let oauthAccessToken = {};

const redirectHash = '#wechat_redirect';
const wxConfig = config.getConfiguration();

const baseUrl = wxConfig.apiUrl;
const oAuthUrl = wxConfig.oAuthUrl + '?', tempUrl = oAuthUrl;

const oAuthDefaultParams = {
  redirect_uri: '',
  response_type: 'code',
  scope: 'snsapi_userinfo'
};

const wx = {
  generateOauthUrl: generateOauthUrl
};

/**
 * get wechat user base info
 * @param code code included in the redirect url
 */
wx.getUserBaseInfo = (code) => {
  return wx.getOAuthAccessToken(code).then((data) => data);
};

/**
 * get wechat user info, including nickname, openid, avatar, etc...
 * @param code
 * @param force force get token first
 * @param withToken return token info together with the profile
 */
wx.getUserInfo = (code, force, withToken) => {
  // if(!force && oauthAccessToken.access_token && !isTokenExpired()) {
  //   debug('using existing access token');
  //   return getUserInfoWithToken(oauthAccessToken, withToken);
  // }
  return wx.getOAuthAccessToken(code).then(function(tokenInfo) {
    return getUserInfoWithToken(tokenInfo, withToken);
  });
};

/**
 * {
 *   code: '', // code query from wechat redirect
 *   returnToken: false, //if token info should be returned together with user profile
 *   force: false //if should get token from wechat server, instead of using the cached token
 * }
 * @param options
 */
wx.getUserInfoByOptions = (options) => {
  return wx.getUserInfo(options.code, options.force, options.returnToken);
};

/**
 * get oauth access token
 * @param code
 */
wx.getOAuthAccessToken = (code) => {
  return util.sendWechatRequest({
    url: baseUrl + '/sns/oauth2/access_token',
    baseUrl: "",
    qs: {
      appid: wxConfig.appId,
      secret: wxConfig.appSecret,
      code: code,
      grant_type: 'authorization_code',
    },
  }).then((data) => {
    oauthAccessToken = data;
    setExpirationTime(data);
    return data;
  }, (reason) => {
    debug('get oauth access token failed!');
    return promise.reject(reason);
  });
};

wx.refreshAccessToken = () => {
  return util.sendWechatRequest({
    url: baseUrl + '/sns/oauth2/refresh_token',
    baseUrl: "",
    qs: {
      appid: wxConfig.appId,
      refresh_token: oauthAccessToken.refresh_token,
      grant_type: 'refresh_token',
    },
  }).then((data) => {
    setExpirationTime(data);
    return data;
  }, () => {
    debug('please get the new code!');
  });
};

wx.isAccessTokenValid = () => {
  return util.sendWechatRequest({
    url: baseUrl + '/sns/auth',
    baseUrl: "",
    qs: {
      appid: wxConfig.appId,
      access_token: oauthAccessToken.access_token,
    },
  }).then((data) => data);
};

wx.getCachedTokenInfo = () => oauthAccessToken;

/**
 * set default wechat oauth url
 */
wx.setDefaultOauthUrl = () => {
  let temp = wxConfig.wechatRedirectUrl;
  if (!temp) {
    temp = wxConfig.wechatRedirectHost + '/wechat/oauth-callback';
  }
  wx.snsUserInfoUrl = generateOauthUrl(temp);
  wx.snsUserBaseUrl = generateOauthUrl(temp, true);
};

/**
 * gen redirect url when use wechat oauth page
 * @param myRedirectUrl
 * @param baseInfo , get base info api, default false which gets userinfo
 * @returns {string}
 */
function generateOauthUrl(myRedirectUrl, baseInfo) {
  let url = tempUrl;
  const tempObj = {
    appid: wxConfig.appId,
  };
  const oauthState = wxConfig.oAuthState || 'userAuth';
  let tempOAuthParams = {};
  if(baseInfo) {
    tempOAuthParams = Object.assign(tempObj, oAuthDefaultParams, {
      redirect_uri: myRedirectUrl,
      scope: 'snsapi_base',
      state: oauthState,
    });
  } else {
    tempOAuthParams = Object.assign(tempObj, oAuthDefaultParams, {
      redirect_uri: myRedirectUrl,
      state: oauthState,
    });
  }
  url += qs.stringify(tempOAuthParams);
  url += redirectHash;
  return url;
}

function getUserInfoWithToken(tokenInfo, withToken) {
  return util.sendWechatRequest({
    url: baseUrl + '/sns/userinfo',
    baseUrl: "",
    qs: {
      access_token: tokenInfo.access_token,
      openid: tokenInfo.openid,
      lang: 'zh_CN',
    },
  }).then((data) => {
    debug('user info received');
    return withToken ? Object.assign({}, tokenInfo, data) : data;
  }, (reason) => {
    debug('get user info failed!');
    return promise.reject(reason);
  });
}

function setExpirationTime(tokenInfo) {
  if(!tokenInfo.expires_in) return;
  const now = Date.now();
  tokenInfo.expirationTime = now + ((tokenInfo.expires_in - 60) * 1000); //minus 60s to expire
}

function isTokenExpired() {
  if(!oauthAccessToken.expirationTime) return true;
  return Date.now() - oauthAccessToken.expirationTime >= 0;
}

setInterval(() => wx.refreshAccessToken(), 1000 * 60 * 158);

module.exports = wx;