const debug = require('debug')('wechat');
const crypto = require("crypto");
const request = require('request-promise');
const Promise = require('bluebird');
const config = require('./config');

const defaultOptions = {
  baseUrl: config.getDefaultConfiguration().apiUrl,
  json: true,
  strictSSL: false,
  simple: false,
  resolveWithFullResponse: true,
};

const util = {};

util.genHash = (text, algorithm = 'sha1') => {
  const c = crypto.createHash(algorithm);
  c.update(text);
  return c.digest("hex");
};

util.genSHA1 = text => util.genHash(text, "sha1");

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

util.sendWechatRequest = (options) => {
  options = Object.assign({}, defaultOptions, options);
  return request(options)
    .then((response) => {
      const body = response.body;
      if(!(/^2/.test(String(response.statusCode)))) {
        return Promise.reject(body);
      }
      if(body.errcode != 0) {
        debug(body);
        return Promise.reject(body);
      }
      return body;
    })
    .catch((err) => {
      debug(err);
      const error = new Error('network error, check your connection');
      error.name = util.errorTypes.WJ_NETWORK_ERROR;
      return Promise.reject(error);
    });
};

util.errorTypes = {
  WJ_NETWORK_ERROR: 'WJ_NETWORK_ERROR',
};

module.exports = util;