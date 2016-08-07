var debug = require('debug')('wechat');
var util = require('./utils')
    , request = require('request')
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
    , oAuthBaseUrl = oAuthUrl
    , tempUrl = oAuthUrl
    ;

var wx = {
  generateOauthUrl: generateOauthUrl
};

/**
 * get wechat user base info
 * @param code code included in the redirect url
 * @param callback
 */
wx.getUserBaseInfo = function (code, callback) {
  wx.getOAuthAccessToken(code, function (tokenInfo) {
    callback && callback(tokenInfo);
  });
};

/**
 * get wechat user info, including nickname, openid, avatar, etc...
 * @param code
 * @param callback
 */
wx.getUserInfo = function (code, callback) {
  if(oauthAccessToken.access_token && !isTokenExpired()) {
    debug('using existing access token');
    getUserInfoWithToken(oauthAccessToken, callback);
    return;
  }
  wx.getOAuthAccessToken(code, function(tokenInfo) {
    getUserInfoWithToken(tokenInfo, callback);
  });
};

/**
 * get oauth access token
 * @param code
 * @param callback
 */
wx.getOAuthAccessToken = function (code, callback) {
  util.sendWechatRequest({
    url: baseUrl + '/sns/oauth2/access_token',
    baseUrl: "",
    qs: {
      appid: wxConfig.appId,
      secret: wxConfig.appSecret,
      code: code,
      grant_type: 'authorization_code'
    }
  }, function (err, data) {
    debug(typeof data, data);
    oauthAccessToken = data;
    setExpirationTime(data);
    callback && callback(data);
  });
};

/**
 *
 * @param callback
 */
wx.refreshAccessToken = function (callback) {
  if(!oauthAccessToken.refresh_token) {
    callback && callback({});
    return;
  }
  util.sendWechatRequest({
    url: baseUrl + '/sns/oauth2/refresh_token',
    baseUrl: "",
    qs: {
      appid: wxConfig.appId,
      refresh_token: oauthAccessToken.refresh_token,
      grant_type: 'refresh_token'
    }
  }, function (err, data) {
    if(data.errcode) {
      debug(data.errcode, data.errmsg);
      debug('please get the new code!');
      return;
    }
    setExpirationTime(data);
    callback && callback(data);
  });
};

/**
 *
 * @param callback
 */
wx.isAccessTokenValid = function(callback) {
  util.sendWechatRequest({
    url: baseUrl + '/sns/auth',
    baseUrl: "",
    qs: {
      appid: wxConfig.appId,
      access_token: oauthAccessToken.access_token
    }
  }, function (err, data) {
    callback && callback(data);
  });
};

/**
 * set default wechat oauth url
 */
wx.setDefaultOauthUrl = function () {
  var temp = wxConfig.wechatRedirectUrl;
  if (!temp) {
    temp = wxConfig.wechatRedirectHost + '/wechat/oauth-callback';
  }
  var oAuthParams = {
    appid: wxConfig.appId,
    redirect_uri: temp,
    response_type: 'code',
    scope: 'snsapi_userinfo',
    state: 'userAuth'
  };
  var oAuthBaseInfoParams = _.extend({}, oAuthParams, {
    scope: 'snsapi_base',
    state: 'userBaseAuth'
  });
  //init wechat oauth url
  oAuthUrl += qs.stringify(oAuthParams);
  oAuthUrl += redirectHash; //fulfill the oAuthUrl
  //debug(oAuthUrl);
  oAuthBaseUrl += qs.stringify(oAuthBaseInfoParams); //fulfill the base oAuthUrl
  oAuthBaseUrl += redirectHash;
  wx.snsUserInfoUrl = oAuthUrl;
  wx.snsUserBaseUrl = oAuthBaseUrl;
};

/**
 * gen redirect url when use wechat oauth page
 * @param myRedirectUrl
 * @returns {string}
 */
function generateOauthUrl(myRedirectUrl) {
  var url = tempUrl;
  var redirectUrl = oAuthParams.redirect_uri + '?url=' + myRedirectUrl;
  var p = _.extend({}, oAuthParams, {redirect_uri: redirectUrl});
  url += qs.stringify(p);
  url += redirectHash;
  return url;
}

function getUserInfoWithToken(tokenInfo, callback) {
  util.sendWechatRequest({
    url: baseUrl + '/sns/userinfo',
    baseUrl: "",
    qs: {
      access_token: tokenInfo.access_token,
      openid: tokenInfo.openid,
      lang: 'zh_CN'
    }
  }, function (err, data) {
    if(data.errcode) {
      debug(data.errcode, data.errmsg);
      debug('get user info failed!');
      callback && callback({});
      return;
    }
    debug('user info received');
    callback && callback(data);
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