const debug = require('debug')('wechat');
const crypto = require("crypto");
const request = require('request-promise');
const promise = require('bluebird');
const config = require('./config');

const defaultOptions = {
  baseUrl: config.getConfiguration().apiUrl,
  json: true,
  strictSSL: false,
  simple: false,
  resolveWithFullResponse: true,
};

const util = {};

util.genHash = (text, algorithm) => {
  const c = crypto.createHash(algorithm ? algorithm : "sha1");
  c.update(text);
  return c.digest("hex");
};

util.genSHA1 = (text) => util.genHash(text, "sha1");

util.paramsToString = (args) => {
  let keys = Object.keys(args);
  keys = keys.sort();
  const newArgs = {};
  keys.forEach(function (key) {
    newArgs[key.toLowerCase()] = args[key];
  });

  let string = '';
  for (let k in newArgs) {
    string += '&' + k + '=' + newArgs[k];
  }
  string = string.substr(1);
  return string;
};

util.sendWechatRequest = (options) => {
  options = Object.assign(defaultOptions, options);
  return request(options).then(function(response) {
    const body = response.body;
    if(!(/^2/.test('' + response.statusCode))) {
      return promise.reject(body);
    }
    if(body.errcode) {
      debug(body);
      return promise.reject(body);
    }
    return body;
  }).catch(function(err) {
    debug(err);
    const error = new Error('network error, check your connection');
    error.name = util.errorTypes.WJ_NETWORK_ERROR;
    return promise.reject(error);
  });
};

util.errorTypes = {
  WJ_NETWORK_ERROR: 'WJ_NETWORK_ERROR',
};

module.exports = util;