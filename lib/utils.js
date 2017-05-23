'use strict';

const debug = require('debug')('wechat');
const crypto = require('crypto');
const request = require('request-promise');
const Promise = require('bluebird');
const xml2js = require('xml2js');
const dateFormat = require('dateformat');
const url = require('url');
const path = require('path');
const config = require('./config');

const defaultOptions = {
  json: true,
  strictSSL: false,
  simple: true,
  resolveWithFullResponse: false,
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
  c.update(content);
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

/**
 * Parse the object to query string without encoding based on the ascii key order
 * @param {object} args
 * @return {string}
 */
utils.paramsToString = (args) => {
  let keys = Object.keys(args);
  keys = keys.sort();
  const newArgs = {};
  keys.forEach((key) => {
    newArgs[key.toLowerCase()] = args[key];
  });

  let str = '';
  for (let k in newArgs) {
    if(newArgs.hasOwnProperty(k)) {
      str += '&' + k + '=' + newArgs[k];
    }
  }
  str = str.substr(1);
  return str;
};

/**
 * Send the request to wechat server
 * @param {object} options custom request options
 * @return {Promise}
 */
utils.sendWechatRequest = (options) => {
  const myOptions = Object.assign({}, defaultOptions, options);
  return request(myOptions)
    .then((body) => {
      if(body.hasOwnProperty('errcode') && body.errcode !== 0) {
        return Promise.reject(body);
      }
      return Promise.resolve(body);
    })
    .catch((err) => {
      debug(err);
      return Promise.reject(err);
    });
};

/**
 * Send the payment request to wechat server
 * @param {object} options custom request options
 * @return {Promise}
 */
utils.sendWechatPaymentRequest = (options) => {
  const myOptions = Object.assign(
    {},
    defaultOptions,
    {
      json: false,
      method: 'POST'
    },
    options);
  return request(myOptions)
    .then((body) => {
      return Promise.resolve(body);
    })
    .catch((err) => {
      debug(err);
      return Promise.reject(err);
    });
};

/**
 * Create nonce string
 * @return {string}
 */
utils.nonceStr = function () {
  return Math.random().toString(36).substr(2, 15);
};

/**
 * Create timestamp string
 * @return {string}
 */
utils.timestamp = function () {
  return parseInt(new Date().getTime() / 1000) + '';
};

/**
 * Check if date is expired
 * @param {Date|string} modifyDate
 * @param {number=} interval milliseconds custom expires in
 * @return {boolean}
 */
utils.isExpired = function (modifyDate, interval) {
  if(interval === undefined) interval = REFRESH_INTERVAL;
  return Date.now() - new Date(modifyDate).getTime() > interval;
};

/**
 * Get global access token from wechat server
 * @param {string} appId
 * @param {string} appSecret
 * @param {string} accessTokenUrl
 * @return {Promise}
 */
utils.getGlobalAccessToken = function (appId, appSecret, accessTokenUrl) {
  const params = {
    grant_type: 'client_credential',
    appid: appId,
    secret: appSecret,
  };
  return utils.sendWechatRequest({
      url: accessTokenUrl,
      qs: params,
    })
    .then(data => data)
    .catch((reason) => {
      debug('get global wechat access token failed!');
      return Promise.reject(reason);
    });
};

/**
 * Parse the xml data returned from wechat server
 * @param xmlData
 * @return {Promise} result promise
 */
utils.parseXML = function (xmlData) {
  const parser = new xml2js.Parser({
    normalize: true,
    explicitRoot: false,
    explicitArray: false,
  });
  return new Promise(function (resolve, reject) {
    parser.parseString(xmlData, function (err, result) {
      if(err) {
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
utils.buildXML = function (objData) {
  const builder = new xml2js.Builder({
    rootName: 'xml',
    cdata: true,
    headless: true,
    allowSurrogateChars: true,
  });
  const xml = builder.buildObject(objData);
  return Promise.resolve(xml);
};

utils.simpleDate = function (date, format) {
  if(!date) {
    date = new Date();
  }
  if(!(date instanceof Date)) {
    date = new Date(date);
  }
  return dateFormat(date, format || 'yyyymmddHHMMss');
};

utils.paymentUrlsWithSandBox = function (paymentUrls) {
  const keys = Object.keys(paymentUrls);
  const newUrls = {};
  keys.forEach((urlKey) => {
    const paymentUrl = paymentUrls[urlKey];
    const obj = url.parse(paymentUrl);
    newUrls[urlKey] = [obj.protocol, '//', obj.host, '/sandboxnew', obj.pathname].join('');
  });
  return newUrls;
};

module.exports = utils;