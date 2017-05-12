'use strict';

const debug = require('debug')('wechat');
const crypto = require('crypto');
const request = require('request-promise');
const Promise = require('bluebird');
const config = require('./config');

const defaultOptions = {
  json: true,
  strictSSL: false,
  simple: true,
  resolveWithFullResponse: false,
};

//1h 59m, token is only valid within 2 hours
const REFRESH_INTERVAL = 1000 * 119 * 60;

const util = {};

/**
 * Generate digest hash based on the content
 * @param {*} content content to be digested
 * @param {string=} algorithm digest algorithm, default 'sha1'
 * @return {string}
 */
util.genHash = (content, algorithm) => {
  const c = crypto.createHash(algorithm);
  c.update(content);
  return c.digest('hex');
};

/**
 * Generate sha1 content
 * @param {*} content
 * @return {string}
 */
util.genSHA1 = content => util.genHash(content, 'sha1');

/**
 * Parse the object to query string without encoding based on the ascii key order
 * @param {object} args
 * @return {string}
 */
util.paramsToString = (args) => {
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
util.sendWechatRequest = (options) => {
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
 * Create nonce string
 * @return {string}
 */
util.nonceStr = function () {
  return Math.random().toString(36).substr(2, 15);
};

/**
 * Create timestamp string
 * @return {string}
 */
util.timestamp = function () {
  return parseInt(new Date().getTime() / 1000) + '';
};

/**
 * Check if date is expired
 * @param {Date|string} modifyDate
 * @param {number=} interval milliseconds custom expires in
 * @return {boolean}
 */
util.isExpired = function (modifyDate, interval) {
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
util.getGlobalAccessToken = function (appId, appSecret, accessTokenUrl) {
  const params = {
    grant_type: 'client_credential',
    appid: appId,
    secret: appSecret,
  };
  return util.sendWechatRequest({
      url: accessTokenUrl,
      qs: params,
    })
    .then(data => data)
    .catch((reason) => {
      debug('get global wechat access token failed!');
      return Promise.reject(reason);
    });
};

module.exports = util;