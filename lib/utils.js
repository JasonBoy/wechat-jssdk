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
      if(body.hasOwnProperty('errcode') && body.errcode != 0) {
        return Promise.reject(body);
      }
      return Promise.resolve(body);
    })
    .catch((err) => {
      debug(err);
      return Promise.reject(err);
    });
};

module.exports = util;