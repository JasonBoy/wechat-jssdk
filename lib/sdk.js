var util = require('./utils')
  , request = require('request')
  , _ = require('lodash')
  , config = require('./config')
  , cache = require('./cache')
  ;

var wxConfig = config.getConfiguration();

var refreshedTimes = 0;
var refreshInterval = 1000 * 119 * 60; //1h 59m, token is only valid within 2 hours
var sdk = {};

//need to verify before you are a wechat developer
sdk.verifySignature = function(query) {
  var keys = [wxConfig.wechatToken, query['timestamp'], query['nonce']];
  var str = keys.sort().join('');
  str = util.genSHA1(str);
  return str === query.signature;
};

sdk.getAccessToken = function(callback) {
  var params = {
    grant_type: "client_credential",
    appid: wxConfig.appId,
    secret: wxConfig.appSecret
  };
  //callback({access_token: util.genSHA1(String(Date.now()).toString())});
  util.sendWechatRequest({
    url: wxConfig.accessTokenUrl,
    baseUrl: "",
    qs: params
  }, function (err, data) {
    //console.log(typeof data, data);
    callback(data);
  });
};
sdk.getWechatTicket = function(accessToken, callback) {
  var params = {
    access_token: accessToken,
    type: 'jsapi'
  };
  util.sendWechatRequest({
    url: wxConfig.ticketUrl,
    baseUrl: "",
    qs: params
  }, function (err, data) {
    callback(data);
  });
};
sdk.updateAccessTokenOrTicketGlobally = function(token, ticket, callback) {
  var info = {modifyDate: new Date()};
  token && (info.accessToken = token);
  ticket && (info.jsapi_ticket = ticket);
  var globalToken = _.extend(cache.globalToken, info);
  globalToken.count++;
  console.log("Access Token or jsapi ticket updated");
  callback(true, globalToken);
};
sdk.getNewTokenAndTicket = function(callback, force) {
  //temp way to prevent refresh too often
  force || refreshedTimes++;
  if(!force && refreshedTimes > 5) {
    callback(false, {});
    return;
  }
  sdk.getAccessToken(function(result) {
    if(result && result.access_token) {
      sdk.getWechatTicket(result.access_token, function(ticketResult) {
        ticketResult && ticketResult.ticket ?
          sdk.updateAccessTokenOrTicketGlobally(result.access_token, ticketResult.ticket, callback) : callback(false, {});
      });
    } else {
      callback(false, {});
    }
  });
};

sdk.prepareNewSignature = function(callback) {
  if(!cache.globalToken.accessToken || (Date.now() - new Date(cache.globalToken.modifyDate).getTime() > refreshInterval)) {
    console.log("get new global ticket");
    sdk.getNewTokenAndTicket(callback);
  } else{
    console.log("global ticket exists");
    callback && callback(true, cache.globalToken);
  }
};


sdk.createNonceStr = function () {
  return Math.random().toString(36).substr(2, 15);
};
sdk.genSignature = function(ticket, url, accessToken) {
  var ret = {
    jsapi_ticket: ticket,
    nonceStr: sdk.createNonceStr(),
    timestamp: parseInt(new Date().getTime() / 1000) + '',
    url: url
  };
  var s = util.paramsToString(ret);
  ret.signature = util.genSHA1(s);
  ret.accessToken = accessToken;
  return ret;
};

sdk.saveNewSignature = function(info, byWho, callback) {
  var signature = _.extend({}, info);
  signature.createDate = new Date();
  signature.modifyDate = signature.createDate;
  if(cache.urls.hasOwnProperty(signature.signatureName)) {
    console.log('Wechat url signature existed, try updating the signature...');
    callback(true, info);
  } else {
    cache.urls[signature.signatureName] = signature;
    console.log('create wechat signature finished');
    callback(false, info);
  }
};

sdk.updateSignatureByUrl = function(url, info, callback) {
  info.modifyDate = new Date();
  delete info.url; //prevent changing the original url
  _.extend(cache.urls[url], info);
  console.log("update wechat signature finished");
  callback(false, info);
};
sdk.getSignatureByURL = function(url) {
  return cache.urls[url];
};
sdk.getGlobalWechatInfo = function() {
  return cache.globalToken;
};

sdk.signatureResult = function(reply) {
  if(!reply) {
    return {};
  }
  delete reply._id;
  return {
    timestamp: reply.timestamp,
    nonceStr: reply.nonceStr,
    signature: reply.signature,
    url: reply.url
  };
};
sdk.createNewSignature = function(req, res, query, forceWechatUpdate) {
  sdk.prepareNewSignature(function (result, data) {
    if(data.accessToken) {
      var ret = sdk.genSignature(data.jsapi_ticket, query.url, data.accessToken);
      ret.signatureName = query.url;
      if(!forceWechatUpdate) {
        sdk.saveNewSignature(ret, null, function(err) {
          if(!err) {
            //var names = config.propName.weChat;
            //var wechatConfig = config.prop[names.name];
            var finalResult = sdk.signatureResult(ret);
            res.json(finalResult);
          } else {
            sdk.updateSignatureByUrl(query.url, ret, function () {
              res.json(sdk.signatureResult(ret));
            });
          }
        });
      } else {
        sdk.updateSignatureByUrl(query.url, ret, function () {
          res.json(sdk.signatureResult(ret));
        });
      }
    } else {
      res.json({});
    }
  });
};

sdk.getTokenFromCache = function(url) {
  return sdk.signatureResult(cache.urls[url]);
};

//clear the counter every 2 hour
setInterval(function () {
  refreshedTimes = 0;
}, 1000 * 7200);

module.exports = sdk;