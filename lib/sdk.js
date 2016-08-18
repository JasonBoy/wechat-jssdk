var debug = require('debug')('wechat');
var util = require('./utils')
  , promise = require('bluebird')
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
 */
sdk.getAccessToken = function() {
  var params = {
    grant_type: 'client_credential',
    appid: wxConfig.appId,
    secret: wxConfig.appSecret
  };
  return util.sendWechatRequest({
    url: wxConfig.accessTokenUrl,
    baseUrl: '',
    qs: params
  }).then(function(data) {
    return data;
  }, function(reason) {
    debug('get wechat access token failed!');
    return promise.reject(reason);
  });
};

/**
 * get wechat ticket with the accessToken
 * @param accessToken token received from the @see getAccessToken above
 */
sdk.getWechatTicket = function(accessToken) {
  var params = {
    access_token: accessToken,
    type: 'jsapi'
  };
  return util.sendWechatRequest({
    url: wxConfig.ticketUrl,
    baseUrl: '',
    qs: params
  }).then(function(data) {
    return data;
  }, function(reason) {
    debug('get ticket failed!');
    return promise.reject(reason);
  });
};

/**
 * update the global token or js_ticket, we should cache this to prevent request too often
 * @param token
 * @param ticket
 */
sdk.updateAccessTokenOrTicketGlobally = function(token, ticket) {
  var info = {modifyDate: new Date()};
  token && (info.accessToken = token);
  ticket && (info.jsapi_ticket = ticket);
  var globalToken = _.extend(cache.globalToken, info);
  globalToken.count++;
  debug('Access Token or jsapi ticket updated');
  return promise.resolve(globalToken);
};

/**
 * get new access token and ticket from wechat server, and update that to cache
 * @param force force update, by default it will only get at most 5 times within 2 hours,
 *        cause the wechat server limits the token access times
 */
sdk.getNewTokenAndTicket = function(force) {
  //temp way to prevent refresh too often
  force || refreshedTimes++;
  if(!force && refreshedTimes > 5) {
    return promise.reject(new Error('maximum manual refresh threshold reached!'));
  }
  var at = '';
  return sdk.getAccessToken().then(function(result) {
    at = result.access_token;
    return sdk.getWechatTicket(at);
  }, function(reason) {
    debug('get new global token failed!');
    return promise.reject(reason);
  }).then(function(ticketResult) {
    return sdk.updateAccessTokenOrTicketGlobally(at, ticketResult.ticket);
  }, function(ticketReason) {
    debug('get new global ticket failed!');
    return promise.reject(ticketReason);
  });
};

/**
 * get or generate global token info for signature generating process
 */
sdk.prepareNewSignature = function() {
  var _gt = cache.globalToken;
  if(!_gt || !_gt.accessToken || isTokenExpired(_gt.modifyDate)) {
    debug('get new global ticket');
    return sdk.getNewTokenAndTicket(true);
  } else{
    debug('global ticket exists');
    return promise.resolve(cache.globalToken);
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
 */
sdk.saveNewSignature = function(info) {
  var signature = _.extend({}, info);
  signature.createDate = new Date();
  signature.modifyDate = signature.createDate;
  if(cache.urls.hasOwnProperty(signature.signatureName)) {
    debug('Wechat url signature existed, try updating the signature...');
    return promise.reject(info);
  } else {
    cache.urls[signature.signatureName] = signature;
    debug('create wechat signature finished');
    return promise.resolve(info);
  }
};

/**
 * update the signature by existing url
 * @param url
 * @param info
 */
sdk.updateSignatureByUrl = function(url, info) {
  info.modifyDate = new Date();
  delete info.url; //prevent changing the original url
  _.extend(cache.urls[url], info);
  debug('update wechat signature finished');
  return promise.resolve(info);
};

/**
 * get the signature form cache or create a new one
 * @param url
 * @returns {*}
 */
sdk.getSignatureByURL = function(url) {
  var signature = cache.urls[url];
  var forceNewSignature = !!arguments[2];
  if(!forceNewSignature && signature && !isTokenExpired(signature.modifyDate)) {
    signature = sdk.signatureResult(signature);
    return promise.resolve(signature);
  }
  return sdk.createNewSignature(url);
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
 */
sdk.createNewSignature = function(url) {
  return sdk.prepareNewSignature().then(function(data) {
    var ret = sdk.genSignature(data.jsapi_ticket, url, data.accessToken);
    ret.signatureName = url;
    return sdk.saveNewSignature(ret);
  }).then(function(newSignature) {
    return sdk.signatureResult(newSignature);
  }, function(reason) {
    return sdk.updateSignatureByUrl(url, reason).then(function(sig) {
      return sdk.signatureResult(sig);
    });
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

function isTokenExpired(modifyDate) {
  return Date.now() - new Date(modifyDate).getTime() > refreshInterval;
}

//clear the counter every 2 hour
setInterval(function () {
  refreshedTimes = 0;
}, 1000 * 7200);

module.exports = sdk;