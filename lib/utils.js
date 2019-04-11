'use strict';

const debug = require('debug')('wechat');
const crypto = require('crypto');

const xml2js = require('xml2js');
const dateFormat = require('date-fns/format');
const url = require('url');
const got = require('got');

const DEFAULT_FORMAT = 'YYYYMMDDHHmmss';

const defaultOptions = {
  json: true,
};

//1h 59m, token is only valid within 2 hours
const REFRESH_INTERVAL = 1000 * 119 * 60;

const utils = {};

/**
 * Generate digest hash based on the content
 * @param {*} content content to be digested
 * @param {string=} algorithm digest algorithm, default 'sha1'
 * @return {string}
 */
utils.genHash = (content, algorithm) => {
  const c = crypto.createHash(algorithm);
  c.update(content, 'utf8');
  return c.digest('hex');
};

/**
 * Generate SHA1 hash
 * @param {*} content
 * @return {string}
 */
utils.genSHA1 = content => utils.genHash(content, 'sha1');

/**
 * Generate MD5 hash
 * @param {*} content
 * @return {string}
 */
utils.genMD5 = content => utils.genHash(content, 'MD5');

utils.genHmacSHA256 = (content, key) => {
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(content, 'utf8');
  return hmac.digest('hex');
};

/**
 * Parse the object to query string without encoding based on the ascii key order
 * @param {object} args
 * @param {boolean} noLowerCase
 * @return {string}
 */
utils.paramsToString = (args, noLowerCase) => {
  let keys = Object.keys(args);
  keys = keys.sort();
  const newArgs = {};
  keys.forEach(key => {
    const temp = noLowerCase ? key : key.toLowerCase();
    newArgs[temp] = args[key];
  });

  let str = '';
  for (let k in newArgs) {
    /* istanbul ignore else  */
    if (newArgs.hasOwnProperty(k)) {
      str += '&' + k + '=' + newArgs[k];
    }
  }
  str = str.substr(1);
  return str;
};

/**
 * Send the request to wechat server
 * @param {string|Object} url
 * @param {object} options custom request options
 * @return {Promise}
 */
utils.sendWechatRequest = (url, options) => {
  const myOptions = Object.assign({}, defaultOptions, options);
  return got(url, myOptions)
    .then(response => {
      const body = response.body;
      if (body.hasOwnProperty('errcode') && body.errcode != 0) {
        return Promise.reject(body);
      }
      return Promise.resolve(body);
    })
    .catch(err => {
      debug(err);
      return Promise.reject(
        err.response && err.response.body ? err.response.body : err
      );
    });
};

/**
 * Send the payment request to wechat server
 * @param {string|Object} url
 * @param {object} options custom request options
 * @return {Promise}
 */
utils.sendWechatPaymentRequest = (url, options) => {
  const myOptions = Object.assign(
    {},
    defaultOptions,
    {
      json: false,
      method: 'POST',
    },
    options
  );
  return got(url, myOptions)
    .then(response => {
      return Promise.resolve(response.body);
    })
    .catch(err => {
      debug(err);
      return Promise.reject(
        err.response && err.response.body ? err.response.body : err
      );
    });
};

/**
 * Create nonce string
 * @return {string}
 */
utils.nonceStr = function() {
  return Math.random()
    .toString(36)
    .substr(2, 15);
};

/**
 * Create timestamp string
 * @return {string}
 */
utils.timestamp = function() {
  return parseInt(new Date().getTime() / 1000) + '';
};

/**
 * Check if date is expired
 * @param {Date|string} modifyDate
 * @param {number=} interval milliseconds custom expires in
 * @return {boolean}
 */
utils.isExpired = function(modifyDate, interval) {
  /* istanbul ignore else  */
  if (interval === undefined) interval = REFRESH_INTERVAL;
  return Date.now() - new Date(modifyDate).getTime() > interval;
};

/**
 * Get global access token from wechat server
 * @param {string} appId
 * @param {string} appSecret
 * @param {string} accessTokenUrl
 * @return {Promise}
 */
utils.getGlobalAccessToken = function(appId, appSecret, accessTokenUrl) {
  const params = {
    grant_type: 'client_credential',
    appid: appId,
    secret: appSecret,
  };
  debug('getting new global token...');
  return utils
    .sendWechatRequest(accessTokenUrl, {
      query: params,
    })
    .then(data => data)
    .catch(reason => {
      debug('get global wechat access token failed!');
      return Promise.reject(reason);
    });
};

/**
 * Parse the xml data returned from wechat server
 * @param xmlData
 * @return {Promise} result promise
 */
utils.parseXML = function(xmlData) {
  const parser = new xml2js.Parser({
    normalize: true,
    explicitRoot: false,
    explicitArray: false,
  });
  return new Promise(function(resolve, reject) {
    parser.parseString(xmlData, function(err, result) {
      /* istanbul ignore if  */
      if (err) {
        debug('result: ' + result);
        debug(err);
        reject(result);
        return;
      }
      resolve(result);
    });
  });
};

/**
 * Build xml data string from the JSON object
 * @param {object} objData
 * @return {Promise}
 */
utils.buildXML = function(objData) {
  const builder = new xml2js.Builder({
    rootName: 'xml',
    cdata: true,
    headless: true,
    allowSurrogateChars: true,
  });
  const xml = builder.buildObject(objData);
  return Promise.resolve(xml);
};

/**
 * Simple Date formatter
 * @param {(string|Date)=} date
 * @param {string=} format
 * @return {string}
 */
utils.simpleDate = function(date = new Date(), format = DEFAULT_FORMAT) {
  /* istanbul ignore if  */
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  return dateFormat(date, format);
};

/**
 * Add "/sandboxnew" for payment apis to for testing
 * @param paymentUrls
 * @return {object}
 */
utils.paymentUrlsWithSandBox = function(paymentUrls) {
  const keys = Object.keys(paymentUrls);
  const newUrls = {};
  keys.forEach(urlKey => {
    const paymentUrl = paymentUrls[urlKey];
    const obj = url.parse(paymentUrl);
    newUrls[urlKey] = [
      obj.protocol,
      '//',
      obj.host,
      '/sandboxnew',
      obj.pathname,
    ].join('');
  });
  return newUrls;
};

/*utils.decodeBase64 = function(b64string) {
  return utils.createBuffer(b64string, 'base64').toString();
};*/

utils.createBuffer = function(str, encoding) {
  const encode = /* istanbul ignore next */ encoding || 'utf8';
  let buf;
  /* istanbul ignore else  */
  if (typeof Buffer.from === 'function') {
    // Node 5.10+
    buf = Buffer.from(str, encode);
  } else {
    // older Node versions
    buf = new Buffer(str, encode);
  }
  return buf;
};

utils.createBufferFromBase64 = function(base64Str) {
  return utils.createBuffer(base64Str, 'base64');
};

module.exports = utils;
