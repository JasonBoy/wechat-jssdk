var debug = require('debug')('wechat');
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

/**
 * need to verify before you are a wechat developer
 * @param query
 * @returns {boolean}
 */
sdk.verifySignature = function(query) {
  var keys = [wxConfig.wechatToken, query['timestamp'], query['nonce']];
  var str = keys.sort().join('');
  str = util.genSHA1(str);
  return str === query.signature;
};

/**
 * send request to get wechat access token
 * @param callback
 */
sdk.getAccessToken = function(callback) {
  var params = {
    grant_type: 'client_credential',
    appid: wxConfig.appId,
    secret: wxConfig.appSecret
  };
  //callback({access_token: util.genSHA1(String(Date.now()).toString())});
  util.sendWechatRequest({
    url: wxConfig.accessTokenUrl,
    baseUrl: '',
    qs: params
  }, function (err, data) {
    //debug(typeof data, data);
    callback(data);
  });
};

/**
 * get wechat ticket with the accessToken
 * @param accessToken token received from the @see getAccessToken above
 * @param callback
 */
sdk.getWechatTicket = function(accessToken, callback) {
  var params = {
    access_token: accessToken,
    type: 'jsapi'
  };
  util.sendWechatRequest({
    url: wxConfig.ticketUrl,
    baseUrl: '',
    qs: params
  }, function (err, data) {
    callback(data);
  });
};

/**
 * update the global token or js_ticket, we should cache this to prevent request too often
 * @param token
 * @param ticket
 * @param callback
 */
sdk.updateAccessTokenOrTicketGlobally = function(token, ticket, callback) {
  var info = {modifyDate: new Date()};
  token && (info.accessToken = token);
  ticket && (info.jsapi_ticket = ticket);
  var globalToken = _.extend(cache.globalToken, info);
  globalToken.count++;
  debug('Access Token or jsapi ticket updated');
  callback(true, globalToken);
};

/**
 * get new access token and ticket from wechat server, and update that to cache
 * @param callback
 * @param force force update, by default it will only get at most 5 times within 2 hours,
 *        cause the wechat server limits the token access times
 */
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

/**
 * get or generate global token info for signature generating process
 * @param callback
 */
sdk.prepareNewSignature = function(callback) {
  if(!cache.globalToken.accessToken || (Date.now() - new Date(cache.globalToken.modifyDate).getTime() > refreshInterval)) {
    debug('get new global ticket');
    sdk.getNewTokenAndTicket(callback);
  } else{
    debug('global ticket exists');
    callback && callback(true, cache.globalToken);
  }
};

/**
 * create NonceStr when gen the signature
 * @returns {string}
 */
sdk.createNonceStr = function () {
  return Math.random().toString(36).substr(2, 15);
};

/**
 * generate the url signature with the provided info
 * @param ticket, js tocket
 * @param url, current url
 * @param accessToken
 * @returns {{jsapi_ticket: *, nonceStr: string, timestamp: string, url: *}}
 */
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

/**
 * save or update the signature
 * @param info
 * @param byWho
 * @param callback
 */
sdk.saveNewSignature = function(info, byWho, callback) {
  var signature = _.extend({}, info);
  signature.createDate = new Date();
  signature.modifyDate = signature.createDate;
  if(cache.urls.hasOwnProperty(signature.signatureName)) {
    debug('Wechat url signature existed, try updating the signature...');
    callback(true, info);
  } else {
    cache.urls[signature.signatureName] = signature;
    debug('create wechat signature finished');
    callback(false, info);
  }
};

/**
 * update the signature by existing url
 * @param url
 * @param info
 * @param callback
 */
sdk.updateSignatureByUrl = function(url, info, callback) {
  info.modifyDate = new Date();
  delete info.url; //prevent changing the original url
  _.extend(cache.urls[url], info);
  debug('update wechat signature finished');
  callback(false, info);
};

/**
 * get the signature form cache or create a new one
 * @param url
 * @param callback
 * @returns {*}
 */
sdk.getSignatureByURL = function(url, callback) {
  var signature = cache.urls[url];
  if(signature) {
    return signature;
  }
  sdk.createNewSignature(url, callback);
};

/**
 * get global token info
 * @returns {cache.globalToken|{count}}
 */
sdk.getGlobalWechatInfo = function() {
  return cache.globalToken;
};


/**
 * filter the signature for the client
 * @param reply
 * @returns {*}
 */
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

/**
 * create a new signature now
 * @param url
 * @param callback
 * @param forceWechatUpdate
 */
sdk.createNewSignature = function(url, callback, forceWechatUpdate) {
  sdk.prepareNewSignature(function (result, data) {
    if(data.accessToken) {
      var ret = sdk.genSignature(data.jsapi_ticket, url, data.accessToken);
      ret.signatureName = url;
      if(!forceWechatUpdate) {
        sdk.saveNewSignature(ret, null, function(err) {
          if(!err) {
            //var names = config.propName.weChat;
            //var wechatConfig = config.prop[names.name];
            var finalResult = sdk.signatureResult(ret);
            callback && callback(finalResult);
          } else {
            sdk.updateSignatureByUrl(url, ret, function () {
              callback && callback(sdk.signatureResult(ret));
            });
          }
        });
      } else {
        sdk.updateSignatureByUrl(url, ret, function () {
          callback && callback(sdk.signatureResult(ret));
        });
      }
    } else {
      callback && callback({});
    }
  });
};

/**
 * just get url signature from cache
 * @param url
 * @returns {{}|{timestamp, nonceStr, signature, url}}
 */
sdk.getTokenFromCache = function(url) {
  return sdk.signatureResult(cache.urls[url]);
};

//clear the counter every 2 hour
setInterval(function () {
  refreshedTimes = 0;
}, 1000 * 7200);

module.exports = sdk;