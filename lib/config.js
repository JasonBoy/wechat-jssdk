'use strict';

const isEmpty = require('lodash.isempty');

const wechatConfig = {
  //redirect host in oauth redirect
  wechatRedirectHost: 'http://127.0.0.1',
  //full redirect url in oauth redirect, e.g http://127.0.0.1/wechat/oauth-callback
  wechatRedirectUrl: '',
  //your wechat token set in your
  // https://mp.weixin.qq.com/advanced/advanced?action=dev&t=advanced/dev&token=1244756112&lang=zh_CN
  wechatToken: '',
  //your wechat appId
  appId: '',
  // your wechat appSecret
  appSecret: '',
  ticketUrl: 'https://api.weixin.qq.com/cgi-bin/ticket/getticket',
  accessTokenUrl: 'https://api.weixin.qq.com/cgi-bin/token',
  oAuthUrl: 'https://open.weixin.qq.com/connect/oauth2/authorize',
  apiUrl: 'https://api.weixin.qq.com',
  //state in oauth callback query
  oAuthState: '',
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
    QUERY_SETTLEMENT: 'https://api.mch.weixin.qq.com/pay/settlementquery',
    // yes this is correct, spelling "exchange" correctly is difficult 🤷️
    QUERY_EXCHANGE_RATE: 'https://api.mch.weixin.qq.com/pay/queryexchagerate',
  },
  decodeCardCodeUrl: 'https://api.weixin.qq.com/card/code/decrypt',
  miniProgram: {
    //your mini program appId
    appId: '',
    // your mini program appSecret
    appSecret: '',
    GET_SESSION_KEY_URL: 'https://api.weixin.qq.com/sns/jscode2session',
  },
};

const COMPARE_CONFIG_KEYS = ['appId', 'wechatRedirectUrl', 'paymentSandBox'];

exports.COMPARE_CONFIG_KEYS = COMPARE_CONFIG_KEYS;

exports.getConfigFromCompareKeys = (
  wechatConfig,
  compareKeys = COMPARE_CONFIG_KEYS
) => {
  const ret = {};
  compareKeys.forEach(k => (ret[k] = wechatConfig[k]));
  return ret;
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

/**
 * Check if the new main wechat config values are the same as the previous one
 * @param {object} newConfig
 * @param {object} oldConfig
 * @param {Array=} compareKeys - custom keys to compare
 * @return {boolean}
 */
exports.isBreakingConfigChange = (
  newConfig,
  oldConfig,
  compareKeys = COMPARE_CONFIG_KEYS
) => {
  if (!newConfig || !oldConfig) {
    return true;
  }
  let isBreaking = false;
  for (let i = 0; i < compareKeys.length; i++) {
    const key = compareKeys[i];
    if (newConfig[key] != oldConfig[key]) {
      isBreaking = true;
      break;
    }
  }
  return isBreaking;
};
