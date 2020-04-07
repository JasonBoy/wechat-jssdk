import debugFnc from 'debug';
import isEmpty from 'lodash.isempty';
import { createDecipher } from 'crypto';
import { Agent } from 'https';
import * as utils from './utils';
import {
  getDefaultConfiguration,
  checkPassedConfiguration,
  WeChatConfig,
  WeChatPaymentAPIConfig,
  WeChatPaymentConfig,
} from './config';

import Store from './store/Store';
import FileStore from './store/FileStore';
import got from 'got';
import { WeChatOptions } from './WeChatOptions';

const debug = debugFnc('wechat-Payment');

const wxConfig = getDefaultConfiguration();

const SIGN_TYPE = {
  MD5: 'MD5',
  HMAC_SHA256: 'HMAC-SHA256',
};

const RESULT_CODE = {
  SUCCESS: 'SUCCESS',
  FAIL: 'FAIL',
};

const PAYMENT_TYPE = {
  JSAPI: 'JSAPI',
  NATIVE: 'NATIVE',
  APP: 'APP',
  MICROPAY: 'MICROPAY',
};

const TRADE_STATE = {
  SUCCESS: '支付成功',
  REFUND: '转入退款',
  NOTPAY: '未支付',
  CLOSED: '已关闭',
  REVOKED: '已撤销（刷卡支付）',
  USERPAYING: '用户支付中',
  PAYERROR: '支付失败',
};

const BILL_TYPE = {
  ALL: 'ALL',
  SUCCESS: 'SUCCESS',
  REFUND: 'REFUND',
  RECHARGE_REFUND: 'RECHARGE_REFUND',
};

const REFUND_STATUS = {
  SUCCESS: 'SUCCESS',
  REFUNDCLOSE: 'REFUNDCLOSE',
  PROCESSING: 'PROCESSING',
  CHANGE: 'CHANGE',
};

const FUND_ACCOUNT_TYPE = {
  BASIC: 'Basic',
  OPERATION: 'Operation',
  FEES: 'Fees',
};

const COUPON_TYPE = {
  CASH: 'CASH',
  NO_CASH: 'NO_CASH',
};

const SANDBOX_SIGN_KEY_ERROR_MSG = '沙箱验证签名失败';
const MAX_SANDBOX_SIGN_KEY_ERROR_ATTEMPTS = 2;

interface PaymentSignatureObject {
  params: object;
  paySign: string;
}
interface ChoosePaymentData {
  timestamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
}
interface PaymentRequestResult {
  return_code?: string;
  return_msg?: string;
  result_code?: string;
  err_code?: number;
  err_code_des?: string;
  //real data
  out_trade_no?: string;
  sandbox_signkey?: string;
}
interface SimpleRequestResult {
  requestData: object;
  responseData: PaymentRequestResult;
}

/**
 * Wechat Payment class
 * @constructor
 * @param {WeChatOptions} options
 * @return {Payment} Payment instance
 */
class Payment {
  options: WeChatOptions;
  paymentConfig: WeChatPaymentConfig;
  paymentAPI: WeChatPaymentAPIConfig;
  notifyUrl: string;
  store: Store;
  paymentAgent: Agent;

  constructor(options?: WeChatOptions) {
    checkPassedConfiguration(options);

    this.options = isEmpty(options)
      ? /* istanbul ignore next  */ { ...wxConfig }
      : {
          ...wxConfig,
          ...options,
          payment: {
            ...wxConfig.payment,
            ...options.payment,
            paymentAPI: {
              ...wxConfig.payment.paymentAPI,
              ...(options.payment && options.payment.paymentAPI),
            },
          },
        };

    this.paymentConfig = this.options.payment;

    /* istanbul ignore if  */
    if (!this.paymentConfig.merchantId) {
      throw new Error('Payment merchant id not found!');
    }

    this.paymentAPI = this.paymentConfig.paymentAPI;
    /* istanbul ignore else  */
    if (this.paymentConfig.paymentSandBox) {
      this.paymentAPI = utils.paymentUrlsWithSandBox(this.paymentAPI);
      this.getSandboxSignKey();
    }

    this.notifyUrl = this.paymentConfig.paymentNotifyUrl;

    /* istanbul ignore if  */
    if (!options.store || !(options.store instanceof Store)) {
      debug('[Payment]Store not provided, using default FileStore...');
      this.store = new FileStore(options.storeOptions);
    } else {
      this.store = options.store;
    }
  }

  /**
   * 1000fen -> 10RMB
   * @param value
   * @return {number}
   */
  static fenToYuan(value): number {
    return Number(value) / 100; //to yuan
  }

  /**
   * 10RMB -> 1000fen, 10.123RMB -> 1012fen
   * @param value
   * @return {number}
   */
  static yuanToFen(value): number {
    return Math.round(Number(value) * 100);
  }

  /**
   * RMB yuan, 10.123 => 10.12, 10 => 10.00, 10.456 => 10.45
   * @param value
   * @return {string} formatted currency
   */
  static formatCurrency(value): string {
    const fen = Payment.yuanToFen(value);
    const yuan = Payment.fenToYuan(fen);
    return yuan.toFixed(2);
  }

  /* istanbul ignore next  */
  static get DOWNLOAD_BILL_TYPE(): object {
    return BILL_TYPE;
  }

  /* istanbul ignore next  */
  static get TRADE_TYPE(): object {
    return PAYMENT_TYPE;
  }

  /* istanbul ignore next  */
  static get TRADE_STATE(): object {
    return TRADE_STATE;
  }

  /* istanbul ignore next  */
  static get REFUND_STATUS(): object {
    return REFUND_STATUS;
  }

  /* istanbul ignore next  */
  static get FUND_ACCOUNT_TYPE(): object {
    return FUND_ACCOUNT_TYPE;
  }

  /* istanbul ignore next  */
  static get SIGN_TYPE(): object {
    return SIGN_TYPE;
  }

  /* istanbul ignore next  */
  static get PAYMENT_TYPE(): object {
    return PAYMENT_TYPE;
  }

  /* istanbul ignore next  */
  static get COUPON_TYPE(): object {
    return COUPON_TYPE;
  }

  /**
   * Generate payment signature
   * @param {object} params
   * @param {string=} signType
   * @param {Boolean=} sandbox gen sign for retrieve sandbox sign key
   * @return {object} signature object
   */
  generateSignature(params, signType?: string, sandbox?: boolean): object {
    const data = this.generateGeneralPaymentSignature(
      params,
      signType || /* istanbul ignore next  */ SIGN_TYPE.MD5,
      sandbox,
    );
    return Object.assign({}, data.params, { sign: data.paySign });
  }

  /**
   * Generate paySign info for jssdk to invoke wechat payment
   * @param {string} prepayId received from unifiedOrder()
   * @param {string=} signType MD5 or SHA1, default MD5
   */
  async generateChooseWXPayInfo(
    prepayId,
    signType,
  ): Promise<ChoosePaymentData> {
    const params = {
      appId: this.options.appId,
      timeStamp: utils.timestamp(),
      nonceStr: utils.nonceStr(),
      package: 'prepay_id=' + prepayId,
      signType: signType || SIGN_TYPE.MD5,
    };
    const ret: PaymentSignatureObject = this.generateGeneralPaymentSignature(
      params,
      params.signType,
    );
    return Promise.resolve({
      timestamp: params.timeStamp,
      nonceStr: params.nonceStr,
      package: params.package,
      signType: params.signType,
      paySign: ret.paySign,
    });
  }

  /**
   * General payment sign generator
   * @param params - data used to gen payment sign
   * @param signType
   * @param sandbox - if gen the sign to get sandbox api key
   */
  generateGeneralPaymentSignature(
    params: object,
    signType: string,
    sandbox?: boolean,
  ): PaymentSignatureObject {
    const originalKeys = Object.keys(params);
    const keys = originalKeys.filter((key) => {
      const val = params[key];
      return (
        typeof key === 'string' &&
        val !== undefined &&
        val !== '' &&
        val !== null
      );
    });
    const newParams = {};
    keys.forEach((key) => {
      newParams[key] = params[key];
    });
    // console.log(utils.buildXML(Object.assign({key: this.wechatConfig.paymentKey}, params))
    //   .then(xml => console.log(xml)));
    let str = utils.paramsToString(newParams, true);
    const key = this.getAPISignKey(sandbox);
    str += '&key=' + key;
    // console.log(params);
    // console.log(str);
    let paySign =
      signType === SIGN_TYPE.HMAC_SHA256
        ? utils.genHmacSHA256(str, key)
        : utils.genMD5(str);
    paySign = paySign.toUpperCase();
    return {
      params: newParams,
      paySign: paySign,
    };
  }

  /**
   * Get extra options when pfx needed
   * @return {object}
   */
  getPaymentAgent(): Agent {
    if (this.paymentAgent) return this.paymentAgent;
    this.paymentAgent = new Agent({
      host: this.paymentAPI.PAYMENT_HOST,
      port: this.paymentAPI.PAYMENT_HOST_PORT,
      pfx: this.paymentConfig.paymentCertificatePfx,
      passphrase:
        this.paymentConfig.paymentPassphrase || this.paymentConfig.merchantId,
    });
    return this.paymentAgent;
  }

  /**
   * Generate simple trade id
   * @return {string}
   */
  simpleTradeNo(): string {
    return utils.simpleDate() + utils.nonceStr().toUpperCase();
  }

  /**
   * Generate unified order from wechat
   * @param {object} orderInfo
   * @return {Promise}
   */
  async unifiedOrder(orderInfo): Promise<object> {
    const data = Object.assign(
      {
        // appid: wechatConfig.appId,
        // mch_id: wechatConfig.merchantId,
        // nonce_str: utils.nonceStr(),
        // sign_type: SIGN_TYPE.MD5,
        out_trade_no: this.simpleTradeNo(),
        notify_url: this.notifyUrl,
        trade_type: PAYMENT_TYPE.JSAPI,
        device_info: 'WEB',
      },
      orderInfo,
    );
    try {
      const result = await this.simpleRequest(
        this.paymentAPI.UNIFIED_ORDER,
        data,
      );
      const responseData = result.responseData;
      if (!responseData.out_trade_no) {
        responseData.out_trade_no = data.out_trade_no;
      }
      debug('unified result ok');
      return Promise.resolve(result);
    } catch (reason) {
      console.error(reason);
      debug('get unified order failed!');
      return Promise.reject(reason);
    }
  }

  /**
   * Query specific order status from wechat
   * @param {object} queryInfo
   * @return {Promise}
   */
  async queryOrder(queryInfo): Promise<object> {
    try {
      return this.simpleRequest(this.paymentAPI.QUERY_ORDER, queryInfo);
    } catch (reason) {
      debug('query order failed!');
      return Promise.reject(reason);
    }
  }

  /**
   * Close order from wechat
   * @param {string} orderId wechat out_trade_no
   * @return {Promise}
   */
  async closeOrder(orderId): Promise<object> {
    try {
      return this.simpleRequest(this.paymentAPI.CLOSE_ORDER, {
        out_trade_no: orderId,
      });
    } catch (reason) {
      debug('close order failed!');
      return Promise.reject(reason);
    }
  }

  /**
   * Request refund from wechat
   * @param {object} info:
   * {
   *   transaction_id: '123',
   *   out_trade_no: '3210', //only one of 'transaction_id' or 'out_trade_no' is required
   *   out_refund_no: '1234', //required, merchant order refund id, similar with 'out_trade_no'
   *   total_fee: '100', //required
   *   refund_fee: '100', //required
   *   refund_fee_type: 'CNY', //optional
   *   refund_desc: '', //optional
   *   refund_account: '', //optional, one of ['REFUND_SOURCE_UNSETTLED_FUNDS', 'REFUND_SOURCE_RECHARGE_FUNDS']
   *   notify_url: '', //optional
   * }
   * @return {Promise}
   */
  async refund(info): Promise<object> {
    const data = this.generateSignature(this.mergeParams(info));
    try {
      const xmlData = await utils.buildXML(data);
      const rawData = await utils.sendWechatPaymentRequest(
        this.paymentAPI.REFUND,
        {
          body: xmlData,
          agent: { https: this.getPaymentAgent() },
        },
      );
      return utils.parseXML(rawData);
    } catch (reason) {
      debug('request refund operation failed!');
      return Promise.reject(reason);
    }
  }

  /**
   * Query refund status from wechat
   * @param {object} info:
   * {
   *   transaction_id: '',
   *   out_trade_no: '',
   *   out_refund_no: '',
   *   refund_id: '', //only one of four above is required
   *   offset: 15, //optional, start from number 16
   * }
   * @return {Promise}
   */
  async queryRefund(info): Promise<object> {
    try {
      return this.simpleRequest(this.paymentAPI.QUERY_REFUND, info);
    } catch (reason) {
      debug('query refund failed!');
      return Promise.reject(reason);
    }
  }

  /**
   * Download bill from wechat
   * @param {string} billDate e.g: 20180603
   * @param {string} billType e.g: FUND_ACCOUNT_TYPE.BASIC
   * @param {boolean=} noGzip if download stream is gziped
   * @return {Promise}
   */
  async downloadBill(billDate, billType, noGzip): Promise<object> {
    const data = this.generateSignature(
      this.mergeParams({
        bill_date: billDate,
        bill_type: billType || BILL_TYPE.ALL,
        tar_type: noGzip ? '' : 'GZIP',
      }),
    );
    return this.download(
      data,
      {
        decompress: !noGzip,
        encoding: null, // get zip file as buffer
      },
      this.paymentAPI.DOWNLOAD_BILL,
    );
  }

  /**
   * Download fund flow
   * @param {string} billDate e.g: 20180603
   * @param {string} accountType e.g: BILL_TYPE.ALL
   * @param {boolean=} noGzip if download stream is gziped
   * @return {Promise}
   */
  async downloadFundFlow(billDate, accountType, noGzip): Promise<object> {
    const data = this.generateSignature(
      this.mergeParams(
        {
          bill_date: billDate,
          account_type: accountType,
          tar_type: noGzip ? '' : 'GZIP',
        },
        SIGN_TYPE.HMAC_SHA256,
      ),
      SIGN_TYPE.HMAC_SHA256,
    );
    return this.download(
      data,
      {
        agent: { https: this.getPaymentAgent() },
        decompress: !noGzip,
      },
      this.paymentAPI.DOWNLOAD_FUND_FLOW,
    );
  }

  /**
   * Download functionality
   * @param {object} data request data
   * @param {object=} requestOptions options send to request
   * @param url to wechat api endpoint
   * @return {Promise} resolve or reject with:
   * {
   *   //an error object, rejected
   *   error: new Error(),
   *   //error msg, , rejected
   *   msg: '',
   *   //resolved with download stream,
   *   //can be piped to other writable stream, e.g: result.data.pipe(fs.createWritableStream('./bill.txt'))
   *   data: Stream,
   *   //sign info from response header
   *   digest: 'SHA=ec45d7c24492dcd62d92472b0f2816c8d9a2d773',
   * }
   */
  async download(data, requestOptions, url): Promise<object> {
    const xmlData = await utils.buildXML(data);
    const myOptions = Object.assign(
      {
        decompress: true,
        method: 'POST',
        body: xmlData,
      },
      requestOptions,
    );
    return new Promise((resolve, reject) => {
      const stream = got.stream(url, myOptions);
      const chunks = [];
      let body = '';
      let response;
      stream.on('response', (res) => {
        response = res;
      });
      stream.on('data', (chunk) => {
        chunks.push(chunk);
      });
      stream.on('end', () => {
        const ret = Buffer.concat(chunks);
        body = ret.toString();
        if (!response || response.statusCode != 200) {
          let str = 'request failed';
          if (response) {
            str += ' with status code: ' + response.statusCode;
          }
          debug(str);
          reject({ error: new Error(str) });
          return;
        }
        if (body && String(body).indexOf('return_code') >= 0) {
          const msg = 'download failed!';
          debug(msg);
          debug(body);
          reject({
            error: new Error(msg),
            msg: body,
          });
          return;
        }
        return resolve({
          //return the request stream
          data: stream,
          body,
          digest: response.headers['digest'],
        });
      });
      stream.on('error', (error, body, response) => {
        debug(error);
        reject({
          error,
          body,
          response,
        });
      });
    });
  }

  /**
   * Report wechat services status to wechat
   * @param {object} info
   * @return {Promise}
   */
  async reportToWechat(info): Promise<object> {
    try {
      return this.simpleRequest(this.paymentAPI.REPORT, info);
    } catch (reason) {
      debug('report status to wechat failed!');
      return Promise.reject(reason);
    }
  }

  async getSandboxSignKey(): Promise<object> {
    const params = {
      mch_id: this.paymentConfig.merchantId,
      nonce_str: utils.nonceStr(),
    };
    const data = this.generateSignature(params, SIGN_TYPE.MD5, true);
    try {
      const xmlData = await utils.buildXML(data);
      // console.log('sandbox key request:', xmlData);
      const rawData = await utils.sendWechatPaymentRequest(
        this.paymentAPI.SIGN_KEY,
        {
          body: xmlData,
        },
      ); // console.log(rawData);
      const jsonData = (await utils.parseXML(rawData)) as PaymentRequestResult;
      this.paymentConfig.paymentSandBoxKey = jsonData.sandbox_signkey;
      return Promise.resolve(jsonData);
    } catch (reason) {
      debug('get sandbox sign key failed!');
      return Promise.reject(reason);
    }
  }

  /**
   * Simplified request wrapper
   * @param {string} apiUrl
   * @param {object} info
   * @param {Number=} attempts, sandbox key error retry count
   */
  async simpleRequest(
    apiUrl,
    info,
    attempts?: number,
  ): Promise<SimpleRequestResult> {
    if (attempts > MAX_SANDBOX_SIGN_KEY_ERROR_ATTEMPTS) {
      const msg = 'maximum sandbox key error attempts reached!';
      debug(msg);
      return Promise.reject(new Error(msg));
    }
    if (!attempts) {
      attempts = 1;
    }
    const data = this.generateSignature(this.mergeParams(info));
    const xmlData = await utils.buildXML(data);
    const rawData = await utils.sendWechatPaymentRequest(apiUrl, {
      body: xmlData,
    }); // console.log(data); // return utils.buildXML(data) //   .then(data => { //     console.log(data); //     return utils.parseXML(data); //   });
    const jsonData = (await utils.parseXML(rawData)) as PaymentRequestResult;
    if (jsonData.return_code == RESULT_CODE.FAIL) {
      debug(jsonData.return_msg);
      //sandbox key error, try get new key and try one more time
      if (
        String(jsonData.return_msg).indexOf(SANDBOX_SIGN_KEY_ERROR_MSG) >= 0
      ) {
        debug(
          'sandbox sign key error, try get new key and try one more time...',
        );
        await this.getSandboxSignKey();
        return this.simpleRequest(apiUrl, info, attempts + 1);
      }
      return Promise.reject(jsonData);
    }
    if (jsonData.result_code == RESULT_CODE.FAIL) {
      debug('ErrorCode[%s]: %s', jsonData.err_code, jsonData.err_code_des);
      return Promise.reject(jsonData);
    }
    return Promise.resolve({
      requestData: data,
      responseData: jsonData,
    });
  }

  /**
   * Merge custom params with default params
   * @param customParams
   * @param signType
   * @return {object}
   */
  mergeParams(customParams, signType?: string): object {
    return Object.assign(
      {
        appid: this.options.appId,
        mch_id: this.paymentConfig.merchantId,
        nonce_str: utils.nonceStr(),
        sign_type: signType || SIGN_TYPE.MD5,
      },
      customParams,
    );
  }

  /**
   * Parse xml data notified by wechat server
   * @param data
   * @return {Promise}
   */
  async parseNotifyData(data): Promise<object> {
    return utils.parseXML(data);
  }

  /**
   * Get xml reply data based on success or fail
   * @param {boolean} isSuccess
   * @return {Promise}
   */
  async replyData(isSuccess): Promise<string> {
    const result: {
      return_code: string;
      return_msg?: string;
    } = {
      return_code: RESULT_CODE.FAIL,
    };
    if (isSuccess) {
      result.return_code = RESULT_CODE.SUCCESS;
      result.return_msg = 'OK';
    }
    return utils.buildXML(result);
  }

  /**
   * Format download bill date to format like: 20170101
   * @param {string|Date} date
   * @return {string}
   */
  getDownloadBillDate(date): string {
    return utils.simpleDate(date, 'YYYYMMDD');
  }

  /**
   * Get api key based on env
   * @param {Boolean=} getSandboxKey the sandbox api key should also use the original payment api key
   */
  getAPISignKey(getSandboxKey?: boolean): string {
    return getSandboxKey ||
      /* istanbul ignore next */ !this.paymentConfig.paymentSandBox
      ? this.paymentConfig.paymentKey
      : /* istanbul ignore next */ this.paymentConfig.paymentSandBoxKey;
  }

  /**
   * Decrypt wechat refund notify result
   * @see https://pay.weixin.qq.com/wiki/doc/api/jsapi.php?chapter=9_16&index=10
   * @param {string} xmlResult notify xml data
   */
  async decryptRefundNotifyResult(
    xmlResult,
  ): Promise<{ parsedXMLData: object; decryptedData: object }> {
    const data: {
      req_info?: string;
    } = await utils.parseXML(xmlResult);
    const originalData = data;
    const md5Key = utils.genMD5(this.getAPISignKey());
    const bufferData = utils.createBufferFromBase64(data.req_info);
    let decoded;
    const decipher = createDecipher('aes-256-ecb', md5Key);
    decipher.setAutoPadding(true);
    decoded = decipher.update(bufferData, 'binary', 'utf8');
    decoded += decipher.final('utf8');
    const ret = JSON.parse(decoded);
    return Promise.resolve({
      parsedXMLData: originalData,
      decryptedData: ret,
    });
  }

  /**
   * Batch query user comments
   * @param {string} beginTime in format 'YYYYMMDDHHmmss'
   * @param {string} endTime same as beginTime
   * @param {number=} offset integer
   * @param {number=} limit integer
   * @return {Promise}
   */
  async queryComments(beginTime, endTime, offset, limit): Promise<object> {
    const data = this.generateSignature(
      this.mergeParams(
        {
          begin_time: beginTime,
          end_time: endTime,
          offset: offset || 0,
          limit: limit,
        },
        SIGN_TYPE.HMAC_SHA256,
      ),
      SIGN_TYPE.HMAC_SHA256,
    );
    try {
      const xmlData = await utils.buildXML(data);
      const data1 = await utils.sendWechatPaymentRequest(
        this.paymentAPI.BATCH_QUERY_COMMENT,
        {
          body: xmlData,
          agent: { https: this.getPaymentAgent() },
        },
      ); //not ok if has xml tag
      if (String(data1).indexOf('<xml>') >= 0) {
        const parsedData = await utils.parseXML(data1);
        return Promise.reject(parsedData);
      }
      return Promise.resolve(data1);
    } catch (reason) {
      debug('query user comments operation failed!');
      return Promise.reject(reason);
    }
  }

  /**
   * International merchant only
   * Retrieve foreign currency settlements within the specified date range
   * @param {object} query
   * @see https://pay.weixin.qq.com/wiki/doc/api/external/jsapi.php?chapter=9_14&index=9
   * @return {Promise}
   */
  async querySettlement(query): Promise<object> {
    try {
      return this.simpleRequest(this.paymentAPI.QUERY_SETTLEMENT, query);
    } catch (reason) {
      debug('query settlement failed!');
      return Promise.reject(reason);
    }
  }

  /**
   * International merchant only
   * Retrieve exchange rate for given foreign currency and date
   * @param {object} query
   * @see https://pay.weixin.qq.com/wiki/doc/api/external/jsapi.php?chapter=9_15&index=10
   * @return {Promise}
   */
  async queryExchangeRate(query): Promise<object> {
    try {
      return this.simpleRequest(
        this.paymentAPI.QUERY_EXCHANGE_RATE,
        Object.assign({}, query, {
          nonce_str: null,
          sign_type: null,
        }),
      );
    } catch (reason) {
      debug('query exchange rate failed!');
      return Promise.reject(reason);
    }
  }
}

export default Payment;
