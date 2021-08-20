'use strict';

const config = {
  wechatToken: '6mwdIm9p@Wg7$Oup',
  appId: 'wxfc9c5237ebf480aa',
  appSecret: '2038576336804a90992b8dbe46cd5948',
  httpClientOptions: {
    // example:
    // customHttpClient: require('axios'),
    // customHttpClient: function (url, options) {
    //   return require('axios')(url, options)
    // },
    // gotOptions: {
    //   decompress: false,
    // },
    httpProxy: 'https://127.0.0.1:8888',
  },
};

exports.config = config;
exports.should = require('chai').should();
