'use strict';

const isEmpty = require('lodash.isempty');

const wechatConfig = {
  wechatRedirectHost: 'http://127.0.0.1', //redirect host in oauth redirect
  wechatRedirectUrl: '', //full redirect url in oauth redirect, e.g http://127.0.0.1/wechat/oauth-callback
  wechatToken: '', //your wechat token set in your https://mp.weixin.qq.com/advanced/advanced?action=dev&t=advanced/dev&token=1244756112&lang=zh_CN
  appId: '', //your wechat appId
  appSecret: '', // your wechat appSecret
  ticketUrl: 'https://api.weixin.qq.com/cgi-bin/ticket/getticket',
  accessTokenUrl: 'https://api.weixin.qq.com/cgi-bin/token',
  oAuthUrl: 'https://open.weixin.qq.com/connect/oauth2/authorize',
  apiUrl: 'https://api.weixin.qq.com',
  oAuthState: '', //state in oauth callback query
  paymentNotifyUrl: 'http://127.0.0.1/api/wechat/payment/',
  paymentSandBox: false,
  paymentKey: '',
  paymentUrls: {
    UNIFIED_ORDER: 'https://api.mch.weixin.qq.com/pay/unifiedorder',
    QUERY_ORDER: 'https://api.mch.weixin.qq.com/pay/orderquery',
    CLOSE_ORDER: 'https://api.mch.weixin.qq.com/pay/closeorder',
    REFUND: 'https://api.mch.weixin.qq.com/secapi/pay/refund',
    QUERY_REFUND: 'https://api.mch.weixin.qq.com/pay/refundquery',
    DOWNLOAD_BILL: 'https://api.mch.weixin.qq.com/pay/downloadbill',
    SHORT_URL: 'https://api.mch.weixin.qq.com/tools/shorturl',
    REPORT: 'https://api.mch.weixin.qq.com/payitil/report',
    SIGN_KEY: 'https://api.mch.weixin.qq.com/pay/getsignkey',
    DOWNLOAD_FUND_FLOW: 'https://api.mch.weixin.qq.com/pay/downloadfundflow',
    BATCH_QUERY_COMMENT:
      'https://api.mch.weixin.qq.com/billcommentsp/batchquerycomment',
  },
  decodeCardCodeUrl: 'https://api.weixin.qq.com/card/code/decrypt',
};

/**
 * Check if user passed necessary configuration
 * @param {object} options user custom wechat config
 */
exports.checkPassedConfiguration = options => {
  if (isEmpty(options)) {
    throw new Error('you need to pass the wechat configuration');
  }
  if (!options.appId) {
    throw new Error('wechat appId not found');
  }
  if (!options.appSecret) {
    throw new Error('wechat appSecret not found');
  }
  return true;
};

/**
 * get default wechat configuration
 * @return {object} wechatConfig
 */
exports.getDefaultConfiguration = () => wechatConfig;
