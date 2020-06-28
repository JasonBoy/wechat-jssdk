import isEmpty from 'lodash.isempty';

export interface WeChatPaymentAPIConfig {
  PAYMENT_HOST: string;
  PAYMENT_HOST_PORT: number;
  UNIFIED_ORDER: string;
  QUERY_ORDER: string;
  CLOSE_ORDER: string;
  REFUND: string;
  QUERY_REFUND: string;
  DOWNLOAD_BILL: string;
  SHORT_URL: string;
  REPORT: string;
  SIGN_KEY: string;
  DOWNLOAD_FUND_FLOW: string;
  BATCH_QUERY_COMMENT: string;
  QUERY_SETTLEMENT: string;
  QUERY_EXCHANGE_RATE: string;
}
export interface WeChatPaymentConfig {
  paymentNotifyUrl: string;
  paymentSandBox?: boolean;
  paymentSandBoxKey?: string;
  paymentKey?: string;
  paymentCertificatePfx?: string | Buffer;
  paymentPassphrase?: string;
  merchantId: string;
  paymentAPI: WeChatPaymentAPIConfig;
  // PAYMENT_HOST: string;
  // PAYMENT_HOST_PORT: number;
}

export interface WeChatMiniProgramConfig {
  //your mini program appId
  appId: string;
  // your mini program appSecret
  appSecret: string;
  GET_SESSION_KEY_URL: string;
}

export interface WeChatConfig {
  // store?: string;
  //redirect host in oauth redirect
  wechatRedirectHost: string;
  //full redirect url in oauth redirect, e.g http://127.0.0.1/wechat/oauth-callback
  wechatRedirectUrl: string;
  //your wechat token set in your
  // @see https://mp.weixin.qq.com/advanced/advanced?action=dev&t=advanced/dev&token=1244756112&lang=zh_CN
  wechatToken: string;
  //your wechat appId
  appId: string;
  //your wechat appSecret
  appSecret: string;
  ticketUrl: string;
  accessTokenUrl: string;
  oAuthUrl: string;
  apiUrl: string;
  //state in oauth callback query
  oAuthState: string;
  //
  decodeCardCodeUrl: string;
  //
  miniProgram: WeChatMiniProgramConfig;
  payment: WeChatPaymentConfig;
}

const wechatConfig: WeChatConfig = {
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

  payment: {
    paymentNotifyUrl: 'http://127.0.0.1/api/wechat/payment/',
    paymentSandBox: false,
    paymentKey: '',
    merchantId: '',
    // PAYMENT_HOST: 'api.mch.weixin.qq.com',
    // PAYMENT_HOST_PORT: 443,
    paymentAPI: {
      PAYMENT_HOST: 'api.mch.weixin.qq.com',
      PAYMENT_HOST_PORT: 443,
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
  },

  // paymentNotifyUrl: 'http://127.0.0.1/api/wechat/payment/',
  // paymentSandBox: false,
  // paymentKey: '',
  // PAYMENT_HOST: 'api.mch.weixin.qq.com',
  // PAYMENT_HOST_PORT: 443,
  // paymentUrls: {
  //   UNIFIED_ORDER: 'https://api.mch.weixin.qq.com/pay/unifiedorder',
  //   QUERY_ORDER: 'https://api.mch.weixin.qq.com/pay/orderquery',
  //   CLOSE_ORDER: 'https://api.mch.weixin.qq.com/pay/closeorder',
  //   REFUND: 'https://api.mch.weixin.qq.com/secapi/pay/refund',
  //   QUERY_REFUND: 'https://api.mch.weixin.qq.com/pay/refundquery',
  //   DOWNLOAD_BILL: 'https://api.mch.weixin.qq.com/pay/downloadbill',
  //   SHORT_URL: 'https://api.mch.weixin.qq.com/tools/shorturl',
  //   REPORT: 'https://api.mch.weixin.qq.com/payitil/report',
  //   SIGN_KEY: 'https://api.mch.weixin.qq.com/pay/getsignkey',
  //   DOWNLOAD_FUND_FLOW: 'https://api.mch.weixin.qq.com/pay/downloadfundflow',
  //   BATCH_QUERY_COMMENT:
  //     'https://api.mch.weixin.qq.com/billcommentsp/batchquerycomment',
  //   QUERY_SETTLEMENT: 'https://api.mch.weixin.qq.com/pay/settlementquery',
  //   // yes this is correct, spelling "exchange" correctly is difficult 🤷️
  //   QUERY_EXCHANGE_RATE: 'https://api.mch.weixin.qq.com/pay/queryexchagerate',
  // },
  decodeCardCodeUrl: 'https://api.weixin.qq.com/card/code/decrypt',
  miniProgram: {
    //your mini program appId
    appId: '',
    // your mini program appSecret
    appSecret: '',
    GET_SESSION_KEY_URL: 'https://api.weixin.qq.com/sns/jscode2session',
  },
};

export const COMPARE_CONFIG_KEYS = [
  'appId',
  'wechatRedirectUrl',
  'paymentSandBox',
];

export function getConfigFromCompareKeys(
  wechatConfig: WeChatConfig,
  compareKeys = COMPARE_CONFIG_KEYS,
): Record<string, unknown> {
  const ret = {};
  compareKeys.forEach((k) => (ret[k] = wechatConfig[k]));
  return ret;
}

/**
 * Check if user passed necessary configuration
 * @param {object} options user custom wechat config
 */
export function checkPassedConfiguration(options: WeChatConfig): boolean {
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
}

/**
 * get default wechat configuration
 * @return {object} wechatConfig
 */
export function getDefaultConfiguration(): WeChatConfig {
  return wechatConfig;
}

/**
 * Check if the new main wechat config values are the same as the previous one
 * @param {object} newConfig
 * @param {object} oldConfig
 * @param {Array=} compareKeys - custom keys to compare
 */
export function isBreakingConfigChange(
  newConfig: WeChatConfig,
  oldConfig: WeChatConfig,
  compareKeys = COMPARE_CONFIG_KEYS,
): boolean {
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
}
