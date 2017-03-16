'use strict';

const isEmpty = require('lodash.isempty');

const wechatConfig = {
  "wechatRedirectHost": "http://127.0.0.1", //redirect host in oauth redirect
  "wechatRedirectUrl": "", //full redirect url in oauth redirect, e.g http://127.0.0.1/wechat/oauth-callback
  "wechatToken": "", //your wechat token set in your https://mp.weixin.qq.com/advanced/advanced?action=dev&t=advanced/dev&token=1244756112&lang=zh_CN
  "appId": "", //your wechat appId
  "appSecret": "", // your wechat appSecret
  "ticketUrl": "https://api.weixin.qq.com/cgi-bin/ticket/getticket",
  "accessTokenUrl": "https://api.weixin.qq.com/cgi-bin/token",
  "oAuthUrl": "https://open.weixin.qq.com/connect/oauth2/authorize",
  "apiUrl": "https://api.weixin.qq.com",
  "oAuthState": "", //state in oauth callback query
};

/**
 * Check if user passed necessary configuration
 * @param {object} options user custom wechat config
 */
exports.checkPassedConfiguration = (options) => {
  if(isEmpty(options)) {
    throw new Error('you need to pass the wechat configuration');
  }
  if(!options.appId) {
    throw new Error('wechat appId not found');
  }
  if(!options.appSecret) {
    throw new Error('wechat appSecret not found');
  }
  return true;
};

/**
 * get default wechat configuration
 * @return {object} wechatConfig
 */
exports.getDefaultConfiguration = () => wechatConfig;
