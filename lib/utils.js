var _ = require('lodash')
  , crypto = require("crypto")
  , request = require('request')
  , config = require('./config')
  ;

var defaultOptions = {
  baseUrl: config.getConfiguration().apiUrl,
  json: true,
  strictSSL: false
};

var util = {};

util.genHash = function(text, agorithm) {
  var c = crypto.createHash(agorithm ? agorithm : "sha1");
  c.update(text);
  return c.digest("hex");
};

util.genSHA1 = function(text) {
  return util.genHash(text, "sha1");
};
util.paramsToString = function(args) {
  var keys = Object.keys(args);
  keys = keys.sort();
  var newArgs = {};
  keys.forEach(function (key) {
    newArgs[key.toLowerCase()] = args[key];
  });

  var string = '';
  for (var k in newArgs) {
    string += '&' + k + '=' + newArgs[k];
  }
  string = string.substr(1);
  return string;
};
util.sendWechatRequest = function(options, callback) {
  options = _.extend(defaultOptions, options);
  request(options, function(err, httpResponse, data) {
    if(err) console.error(err, data);
    callback && callback(err, data);
  });
};

module.exports = util;