const debug = require('debug')('wechat');
const util = require('./utils');
const promise = require('bluebird');
const config = require('./config');
const cache = require('./cache');

const wxConfig = config.getDefaultConfiguration();

//1h 59m, token is only valid within 2 hours
const REFRESH_INTERVAL = 1000 * 119 * 60;
const sdk = {};

let refreshedTimes = 0;

/**
 * need to verify before you are a wechat developer
 * @param query
 * @returns {boolean}
 */
sdk.verifySignature = (query) => {
  const keys = [wxConfig.wechatToken, query['timestamp'], query['nonce']];
  let str = keys.sort().join('');
  str = util.genSHA1(str);
  return str === query.signature;
};

/**
 * send request to get wechat access token
 */
sdk.getAccessToken = () => {
  const params = {
    grant_type: 'client_credential',
    appid: wxConfig.appId,
    secret: wxConfig.appSecret,
  };
  return util.sendWechatRequest({
    url: wxConfig.accessTokenUrl,
    baseUrl: '',
    qs: params,
  }).then((data) => {
    return data;
  }, (reason) => {
    debug('get wechat access token failed!');
    return promise.reject(reason);
  });
};

/**
 * get wechat ticket with the accessToken
 * @param accessToken token received from the @see getAccessToken above
 */
sdk.getWechatTicket = (accessToken) => {
  const params = {
    access_token: accessToken,
    type: 'jsapi',
  };
  return util.sendWechatRequest({
    url: wxConfig.ticketUrl,
    baseUrl: '',
    qs: params,
  }).then((data) => {
    return data;
  }, (reason) => {
    debug('get ticket failed!');
    return promise.reject(reason);
  });
};

/**
 * update the global token or js_ticket, we should cache this to prevent request too often
 * @param token
 * @param ticket
 */
sdk.updateAccessTokenOrTicketGlobally = (token, ticket) => {
  const info = {modifyDate: new Date()};
  token && (info.accessToken = token);
  ticket && (info.jsapi_ticket = ticket);
  const globalToken = Object.assign(cache.globalToken, info);
  globalToken.count++;
  debug('Access Token or jsapi ticket updated');
  return promise.resolve(globalToken);
};

/**
 * get new access token and ticket from wechat server, and update that to cache
 * @param force force update, by default it will only get at most 5 times within 2 hours,
 *        cause the wechat server limits the token access times
 */
sdk.getNewTokenAndTicket = (force) => {
  //temp way to prevent refresh too often
  force || refreshedTimes++;
  if(!force && refreshedTimes > 5) {
    return promise.reject(new Error('maximum manual refresh threshold reached!'));
  }
  let at = '';
  return sdk.getAccessToken().then((result) => {
    at = result.access_token;
    return sdk.getWechatTicket(at);
  }, (reason) => {
    debug('get new global token failed!');
    return promise.reject(reason);
  }).then((ticketResult) => {
    return sdk.updateAccessTokenOrTicketGlobally(at, ticketResult.ticket);
  }, (ticketReason) => {
    debug('get new global ticket failed!');
    return promise.reject(ticketReason);
  });
};

/**
 * get or generate global token info for signature generating process
 */
sdk.prepareNewSignature = () => {
  let _gt = cache.globalToken;
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
sdk.createNonceStr = () => Math.random().toString(36).substr(2, 15);

/**
 * generate the url signature with the provided info
 * @param ticket, js tocket
 * @param url, current url
 * @param accessToken
 * @returns {{jsapi_ticket: *, nonceStr: string, timestamp: string, url: *}}
 */
sdk.genSignature = (ticket, url, accessToken) => {
  const ret = {
    jsapi_ticket: ticket,
    nonceStr: sdk.createNonceStr(),
    timestamp: parseInt(new Date().getTime() / 1000) + '',
    url: url,
  };
  const s = util.paramsToString(ret);
  ret.signature = util.genSHA1(s);
  ret.accessToken = accessToken;
  return ret;
};

/**
 * save or update the signature
 * @param info
 */
sdk.saveNewSignature = (info) => {
  const signature = Object.assign({}, info);
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
sdk.updateSignatureByUrl = (url, info) => {
  info.modifyDate = new Date();
  delete info.url; //prevent changing the original url
  Object.assign(cache.urls[url], info);
  debug('update wechat signature finished');
  return promise.resolve(info);
};

/**
 * get the signature from cache or create a new one
 * @param url
 * @param forceNewSignature
 * @returns {*}
 */
sdk.getSignatureByURL = (url, forceNewSignature) => {
  let signature = cache.urls[url];
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
sdk.getGlobalWechatInfo = () => cache.globalToken;


/**
 * filter the signature for the client
 * @param reply
 * @returns {*}
 */
sdk.signatureResult = (reply) => {
  if(!reply) {
    return {};
  }
  delete reply._id;
  return {
    timestamp: reply.timestamp,
    nonceStr: reply.nonceStr,
    signature: reply.signature,
    url: reply.url,
  };
};

/**
 * create a new signature now
 * @param url
 */
sdk.createNewSignature = (url) => {
  return sdk.prepareNewSignature().then((data) => {
    const ret = sdk.genSignature(data.jsapi_ticket, url, data.accessToken);
    ret.signatureName = url;
    return sdk.saveNewSignature(ret);
  }).then((newSignature) => {
    return sdk.signatureResult(newSignature);
  }, (reason) => {
    return sdk.updateSignatureByUrl(url, reason)
      .then((sig) => sdk.signatureResult(sig));
  });
};

/**
 * just get url signature from cache
 * @param url
 * @returns {{}|{timestamp, nonceStr, signature, url}}
 */
sdk.getTokenFromCache = (url) => sdk.signatureResult(cache.urls[url]);

sdk.getCachedWechatInfo = () => cache;
sdk.getCachedGlobalToken = () => cache.globalToken;
sdk.getCachedUrlSignature = () => cache.urls;

function isTokenExpired(modifyDate) {
  return Date.now() - new Date(modifyDate).getTime() > REFRESH_INTERVAL;
}

//clear the counter every 2 hour
setInterval(() => refreshedTimes = 0, 1000 * 7200);

module.exports = sdk;