var util = require('./utils')
  , request = require('request')
  , qs = require("querystring")
  , _ = require('lodash')
  , config = require('./config')
  , cache = require('./cache')
  ;

var redirectHash = '#wechat_redirect';
var wxConfig = config.getConfiguration();

var baseUrl = wxConfig.apiUrl;
var oAuthUrl = wxConfig.oAuthUrl + '?'
  , oAuthBaseUrl = oAuthUrl
  , tempUrl = oAuthUrl
  ;
var oAuthParams = {
  appid: wxConfig.appId,
  redirect_uri: wxConfig.wechatRedirectHost + '/wechat/oauth-callback',
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
//console.log(oAuthUrl);
oAuthBaseUrl += qs.stringify(oAuthBaseInfoParams); //fulfill the base oAuthUrl
oAuthBaseUrl += redirectHash;


var wx = {
  snsUserInfoUrl: oAuthUrl,
  snsUserBaseUrl: oAuthBaseUrl,
  generateOauthUrl: generateOauthUrl
};

//get user openId
wx.getUserBaseInfo = function(code, outsideCallback) {
  wx.getOAuthAccessToken(code, function (tokenInfo) {
    outsideCallback(tokenInfo);
  });
};
wx.getUserInfo = function(code, outsideCallback) {
  wx.getOAuthAccessToken(code, function (tokenInfo) {
    util.sendWechatRequest({
      url: baseUrl + '/sns/userinfo',
      baseUrl: "",
      qs: {
        access_token: tokenInfo.access_token,
        openid: tokenInfo.openid,
        lang: 'zh_CN'
      }
    }, function (err, data) {
      console.log('user info received');
      outsideCallback && outsideCallback(data);
      //user.createOrUpdate(data, outsideCallback);
    });
  });
};
wx.getOAuthAccessToken = function(code, callback) {
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
    //console.log(typeof data, data);
    callback && callback(data);
  });
};

function generateOauthUrl(myRedirectUrl) {
  var url = tempUrl;
  var redirectUrl = oAuthParams.redirect_uri + '?url=' + myRedirectUrl;
  var p = _.extend({}, oAuthParams, {redirect_uri: redirectUrl});
  url += qs.stringify(p);
  url += redirectHash;
  return url;
}

module.exports = wx;