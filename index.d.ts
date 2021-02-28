import { ConnectionOptions } from "mongoose";

export class BaseClass {
  constructor(config?: WechatConfig);
}

export class Card extends BaseClass {
  decryptCardCode(...args: any[]): void;

  getApiTicket(...args: any[]): void;

  getApiTicketRemotely(...args: any[]): void;

  getCardExt(...args: any[]): void;

  getCardSignature(...args: any[]): void;

  getGlobalToken(...args: any[]): void;

  sendDecodeRequest(...args: any[]): void;

  static CARD_TYPE: {
    CASH: string;
    DISCOUNT: string;
    GENERAL_COUPON: string;
    GIFT: string;
    GROUPON: string;
  };

  static CODE_TYPE: {
    CODE_TYPE_BARCODE: string;
    CODE_TYPE_NONE: string;
    CODE_TYPE_ONLY_QRCODE: string;
    CODE_TYPE_QRCODE: string;
    CODE_TYPE_TEXT: string;
  };
}

export class FileStore {
  constructor(config?: FileStoreOptions);

  destroy(...args: any[]): void;

  flush(...args: any[]): void;

  initFileStore(...args: any[]): void;

  static StoreEvents: {
    DESTROY: string;
    DESTROYED: string;
    FLUSH_STORE: string;
    STORE_FLUSHED: string;
  };

  static defaultMaxListeners: number;

  static init(): void;

  static listenerCount(emitter: any, type: any): any;

  static once(emitter: any, name: any): any;

  static usingDomains: boolean;
}

export class JSSDK extends BaseClass {
  createSignature(...args: any[]): void;

  filterSignature(...args: any[]): void;

  getAccessToken(...args: any[]): void;

  getCachedSignature(...args: any[]): void;

  getGlobalTokenAndTicket(...args: any[]): void;

  getJsApiTicket(...args: any[]): void;

  getSignature(...args: any[]): void;

  prepareGlobalToken(...args: any[]): void;

  saveSignature(...args: any[]): void;

  updateAccessTokenOrTicketGlobally(...args: any[]): void;

  updateSignature(...args: any[]): void;

  verifySignature(...args: any[]): void;

  static createNonceStr(...args: any[]): void;

  static generateSignature(...args: any[]): void;

  static isTokenExpired(...args: any[]): void;

  static normalizeUrl(...args: any[]): void;
}

export class MiniProgram extends BaseClass {
  decryptData(...args: any[]): void;

  genSignature(...args: any[]): void;

  getSession(...args: any[]): void;

  verifySignature(...args: any[]): void;
}

export class MongoStore {
  constructor(config?: MongoStoreOptions);

  destroy(...args: any[]): void;

  flush(...args: any[]): void;

  flushCardTicket(...args: any[]): void;

  flushGlobalToken(...args: any[]): void;

  flushOAuthTokens(...args: any[]): void;

  flushSignatures(...args: any[]): void;

  getCardTicket(...args: any[]): void;

  getGlobalToken(...args: any[]): void;

  getOAuthAccessToken(...args: any[]): void;

  getOAuthTokens(...args: any[]): void;

  getSignature(...args: any[]): void;

  getUrlSignatures(...args: any[]): void;

  initializeTokenFromDB(...args: any[]): void;

  saveOAuthAccessToken(...args: any[]): void;

  saveSignature(...args: any[]): void;

  toObject(...args: any[]): void;

  updateCardTicket(...args: any[]): void;

  updateGlobalToken(...args: any[]): void;

  updateOAuthAccessToken(...args: any[]): void;

  updateSignature(...args: any[]): void;

  static StoreEvents: {
    DESTROY: string;
    DESTROYED: string;
    FLUSH_STORE: string;
    STORE_FLUSHED: string;
  };

  static defaultMaxListeners: number;

  static init(): void;

  static listenerCount(emitter: any, type: any): any;

  static once(emitter: any, name: any): any;

  static usingDomains: boolean;
}

export class OAuth extends BaseClass {
  generateOAuthUrl(...args: any[]): void;

  getAccessToken(...args: any[]): void;

  getAccessTokenRemotely(...args: any[]): void;

  getUserBaseInfo(...args: any[]): void;

  getUserInfo(...args: any[]): void;

  getUserInfoRemotely(...args: any[]): void;

  isAccessTokenValid(...args: any[]): void;

  refreshAccessToken(...args: any[]): void;

  setDefaultOAuthUrl(...args: any[]): void;

  static isAccessTokenExpired(...args: any[]): void;

  static setAccessTokenExpirationTime(...args: any[]): void;
}

export class Payment extends BaseClass {
  closeOrder(...args: any[]): void;

  decryptRefundNotifyResult(...args: any[]): void;

  download(...args: any[]): void;

  downloadBill(...args: any[]): void;

  downloadFundFlow(...args: any[]): void;

  generateChooseWXPayInfo(...args: any[]): void;

  generateGeneralPaymentSignature(...args: any[]): void;

  generateSignature(...args: any[]): void;

  getAPISignKey(...args: any[]): void;

  getDownloadBillDate(...args: any[]): void;

  getPaymentAgent(...args: any[]): void;

  getSandboxSignKey(...args: any[]): void;

  mergeParams(...args: any[]): void;

  parseNotifyData(...args: any[]): void;

  queryComments(...args: any[]): void;

  queryExchangeRate(...args: any[]): void;

  queryOrder(...args: any[]): void;

  queryRefund(...args: any[]): void;

  querySettlement(...args: any[]): void;

  refund(...args: any[]): void;

  replyData(...args: any[]): void;

  reportToWechat(...args: any[]): void;

  simpleRequest(...args: any[]): void;

  simpleTradeNo(...args: any[]): void;

  unifiedOrder(...args: any[]): void;

  static COUPON_TYPE: {
    CASH: string;
    NO_CASH: string;
  };

  static DOWNLOAD_BILL_TYPE: {
    ALL: string;
    RECHARGE_REFUND: string;
    REFUND: string;
    SUCCESS: string;
  };

  static FUND_ACCOUNT_TYPE: {
    BASIC: string;
    FEES: string;
    OPERATION: string;
  };

  static PAYMENT_TYPE: {
    APP: string;
    JSAPI: string;
    MICROPAY: string;
    NATIVE: string;
  };

  static REFUND_STATUS: {
    CHANGE: string;
    PROCESSING: string;
    REFUNDCLOSE: string;
    SUCCESS: string;
  };

  static SIGN_TYPE: {
    HMAC_SHA256: string;
    MD5: string;
  };

  static TRADE_STATE: {
    CLOSED: string;
    NOTPAY: string;
    PAYERROR: string;
    REFUND: string;
    REVOKED: string;
    SUCCESS: string;
    USERPAYING: string;
  };

  static TRADE_TYPE: {
    APP: string;
    JSAPI: string;
    MICROPAY: string;
    NATIVE: string;
  };

  static fenToYuan(...args: any[]): void;

  static formatCurrency(...args: any[]): void;

  static yuanToFen(...args: any[]): void;
}

export class Store {
  constructor(...args: any[]);

  clearStore(...args: any[]): void;

  destroy(...args: any[]): void;

  flush(...args: any[]): void;

  getCardTicket(...args: any[]): void;

  getGlobalToken(...args: any[]): void;

  getMPSession(...args: any[]): void;

  getMPSessionKey(...args: any[]): void;

  getOAuthAccessToken(...args: any[]): void;

  getSignature(...args: any[]): void;

  isSignatureExisting(...args: any[]): void;

  saveOAuthAccessToken(...args: any[]): void;

  saveSignature(...args: any[]): void;

  setMPSession(...args: any[]): void;

  updateCardTicket(...args: any[]): void;

  updateGlobalToken(...args: any[]): void;

  updateOAuthAccessToken(...args: any[]): void;

  updateSignature(...args: any[]): void;

  static StoreEvents: {
    DESTROY: string;
    DESTROYED: string;
    FLUSH_STORE: string;
    STORE_FLUSHED: string;
  };

  static defaultMaxListeners: number;

  static init(): void;

  static listenerCount(emitter: any, type: any): any;

  static once(emitter: any, name: any): any;

  static usingDomains: boolean;
}

export class Wechat extends BaseClass {
  jssdk: JSSDK
  oauth: OAuth
  card?: Card
  payment?: Payment
  miniProgram?: MiniProgram
  store: Store
}

export interface WechatConfigPaymentUrls {
  UNIFIED_ORDER?: string;
  QUERY_ORDER?: string;
  CLOSE_ORDER?: string;
  REFUND?: string;
  QUERY_REFUND?: string;
  DOWNLOAD_BILL?: string;
  SHORT_URL?: string;
  REPORT?: string;
  SIGN_KEY?: string;
  DOWNLOAD_FUND_FLOW?: string;
  BATCH_QUERY_COMMENT?: string;
  QUERY_SETTLEMENT?: string;
  // yes this is correct, spelling "exchange" correctly is difficult 🤷️
  QUERY_EXCHANGE_RATE?: string;
}

export interface WetchatConfigMiniProgram {
  //your mini program appId
  appId: string;
  // your mini program appSecret
  appSecret: string;
  GET_SESSION_KEY_URL?: string;
}

export interface WechatConfig {
  //redirect host in oauth redirect
  wechatRedirectHost?: string;
  //full redirect url in oauth redirect, e.g http://127.0.0.1/wechat/oauth-callback
  wechatRedirectUrl?: string;
  //your wechat token set in your
  // https://mp.weixin.qq.com/advanced/advanced?action=dev&t=advanced/dev&token=1244756112&lang=zh_CN
  wechatToken?: string;
  //your wechat appId
  appId: string;
  // your wechat appSecret
  appSecret: string;
  ticketUrl?: string;
  accessTokenUrl?: string;
  oAuthUrl?: string;
  apiUrl?: string;
  //state in oauth callback query
  oAuthState?: string;
  paymentNotifyUrl?: string;
  paymentSandBox?: false;
  paymentKey?: string;
  PAYMENT_HOST?: string;
  PAYMENT_HOST_PORT?: 443;
  paymentUrls?: WechatConfigPaymentUrls;
  decodeCardCodeUrl?: string;
  miniProgram?: WetchatConfigMiniProgram;
  storeOptions?: FileStoreOptions;
  store?: Store;
}

export interface MongoStoreOptions {
  dbHost?: string; //default?: "127.0.0.1"
  dbPort?: string; //default?: "27017"
  dbName?: string; //default?: "wechat"
  dbAddress?: string; //pass your full uri, the three options above will be ignored.
  dbOptions?: ConnectionOptions; //extra options passed to mongoose
  limit?: 10; //how many url signature and oauth token items should be initialized from db, default?: 20
}

export interface FileStoreOptions {
  fileStorePath?: string;
}
