var debug = require('debug')('wechat');
var util = require('./utils')
    , promise = require('bluebird')
    , qs = require("querystring")
    , _ = require('lodash')
    , config = require('./config')
    , cache = require('./cache')
    ;
/**
 * {
     "access_token":"ACCESS_TOKEN",
     "expires_in":7200,
     "refresh_token":"REFRESH_TOKEN",
     "openid":"OPENID",
     "scope":"SCOPE",
     "unionid": "o6_bmasdasdsad6_2sgVt7hMZOPfL"
   }
 * @type {{}}
 */
var oauthAccessToken = {};
var redirectHash = '#wechat_redirect';
var wxConfig = config.getConfiguration();

var baseUrl = wxConfig.apiUrl;
var oAuthUrl = wxConfig.oAuthUrl + '?'
    , tempUrl = oAuthUrl
    ;

var oAuthDefaultParams = {
  redirect_uri: '',
  response_type: 'code',
  scope: 'snsapi_userinfo'
};

var wx = {
  generateOauthUrl: generateOauthUrl
};

/**
 * get wechat user base info
 * @param code code included in the redirect url
 */
wx.getUserBaseInfo = function (code) {
  return wx.getOAuthAccessToken(code).then(function(data) {
    return data;
  });
};

/**
 * get wechat user info, including nickname, openid, avatar, etc...
 * @param code
 * @param force force get token first
 * @param withToken return token info together with the profile
 */
wx.getUserInfo = function (code, force, withToken) {
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
wx.getUserInfoByOptions = function(options) {
  return wx.getUserInfo(options.code, options.force, options.returnToken);
};

/**
 * get oauth access token
 * @param code
 */
wx.getOAuthAccessToken = function (code) {
  return util.sendWechatRequest({
    url: baseUrl + '/sns/oauth2/access_token',
    baseUrl: "",
    qs: {
      appid: wxConfig.appId,
      secret: wxConfig.appSecret,
      code: code,
      grant_type: 'authorization_code'
    }
  }).then(function(data) {
    oauthAccessToken = data;
    setExpirationTime(data);
    return data;
  }, function(reason) {
    debug('get oauth access token failed!');
    return promise.reject(reason);
  });
};

wx.refreshAccessToken = function () {
  return util.sendWechatRequest({
    url: baseUrl + '/sns/oauth2/refresh_token',
    baseUrl: "",
    qs: {
      appid: wxConfig.appId,
      refresh_token: oauthAccessToken.refresh_token,
      grant_type: 'refresh_token'
    }
  }).then(function(data) {
    setExpirationTime(data);
    return data;
  }, function() {
    debug('please get the new code!');
  });
};

/**
 * check if cached token is still valid
 * @returns promise
 */
wx.isAccessTokenValid = function() {
  return util.sendWechatRequest({
    url: baseUrl + '/sns/auth',
    baseUrl: "",
    qs: {
      appid: wxConfig.appId,
      access_token: oauthAccessToken.access_token
    }
  }).then(function(data) {
    return data;
  });
};

wx.getCachedTokenInfo = function() {
  return oauthAccessToken;
};

/**
 * set default wechat oauth url
 */
wx.setDefaultOauthUrl = function () {
  var temp = wxConfig.wechatRedirectUrl;
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
  var url = tempUrl;
  var tempObj = {
    appid: wxConfig.appId
  };
  var oauthState = wxConfig.oAuthState || 'userAuth';
  var tempOAuthParams = {};
  if(baseInfo) {
    tempOAuthParams = _.assign(tempObj, oAuthDefaultParams, {
      redirect_uri: myRedirectUrl,
      scope: 'snsapi_base',
      state: oauthState
    });
  } else {
    tempOAuthParams = _.assign(tempObj, oAuthDefaultParams, {
      redirect_uri: myRedirectUrl,
      state: oauthState
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
      lang: 'zh_CN'
    }
  }).then(function(data) {
    debug('user info received');
    return withToken ? _.assign({}, tokenInfo, data) : data;
  }, function (reason) {
    debug('get user info failed!');
    return promise.reject(reason);
  });
}

function setExpirationTime(tokenInfo) {
  if(!tokenInfo.expires_in) return;
  var now = Date.now();
  tokenInfo.expirationTime = now + ((tokenInfo.expires_in - 60) * 1000); //minus 60s to expire
}

function isTokenExpired() {
  if(!oauthAccessToken.expirationTime) return true;
  return Date.now() - oauthAccessToken.expirationTime >= 0;
}

setInterval(function() {
  wx.refreshAccessToken();
}, 1000 * 60 * 158);

module.exports = wx;