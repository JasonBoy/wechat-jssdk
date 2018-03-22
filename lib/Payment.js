'use strict';

const debug = require('debug')('wechat-Payment');
const Promise = require('bluebird');
const isEmpty = require('lodash.isempty');
const request = require('request');
const CryptoJS = require('crypto-js');

const utils = require('./utils');
const config = require('./config');

const Store = require('./store/Store');
const FileStore = require('./store/FileStore');

const wxConfig = config.getDefaultConfiguration();

let paymentUrls = wxConfig.paymentUrls;

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

class Payment {
  /**
   * Wechat Payment class
   * @constructor
   * @param options
   * @return {Payment} Payment instance
   */
  constructor(options) {
    config.checkPassedConfiguration(options);

    this.wechatConfig = isEmpty(options)
      ? wxConfig
      : Object.assign({}, wxConfig, options);
    // if(!this.wechatConfig.paymentKey) {
    //   throw new Error('Payment key not found, pls go to wechat payment dashboard to get the key!');
    // }
    if (!this.wechatConfig.paymentCertificatePfx) {
      throw new Error(
        'Payment certificate key not found, pls provide pkcs12 key!'
      );
    }
    if (!this.wechatConfig.merchantId) {
      throw new Error('Payment merchant id not found!');
    }

    this.paymentUrls = Object.assign(
      {},
      paymentUrls,
      this.wechatConfig.paymentUrls
    );
    if (this.wechatConfig.paymentSandBox) {
      this.paymentUrls = utils.paymentUrlsWithSandBox(this.paymentUrls);
      this.getSandboxSignKey();
    }

    this.notifyUrl = options.paymentNotifyUrl || wxConfig.paymentNotifyUrl;

    if (!options.store || !(options.store instanceof Store)) {
      debug('Store not provided, using default FileStore...');
      this.store = new FileStore(options);
    } else {
      this.store = options.store;
    }
  }

  /**
   * 1000fen -> 10RMB
   * @param value
   * @return {number}
   */
  static fenToYuan(value) {
    return Number(value) / 100; //to yuan
  }

  /**
   * 10RMB -> 1000fen, 10.123RMB -> 1012fen
   * @param value
   * @return {number}
   */
  static yuanToFen(value) {
    return Math.round(Number(value) * 100);
  }

  /**
   * RMB yuan, 10.123 => 10.12, 10 => 10.00, 10.456 => 10.45
   * @param value
   * @return {string} formatted currency
   */
  static formatCurrency(value) {
    const fen = Payment.yuanToFen(value);
    const yuan = Payment.fenToYuan(fen);
    return yuan.toFixed(2);
  }

  static get DOWNLOAD_BILL_TYPE() {
    return BILL_TYPE;
  }

  static get TRADE_TYPE() {
    return PAYMENT_TYPE;
  }

  static get TRADE_STATE() {
    return TRADE_STATE;
  }

  static get REFUND_STATUS() {
    return REFUND_STATUS;
  }

  static get FUND_ACCOUNT_TYPE() {
    return FUND_ACCOUNT_TYPE;
  }

  static get SIGN_TYPE() {
    return SIGN_TYPE;
  }

  static get PAYMENT_TYPE() {
    return PAYMENT_TYPE;
  }

  static get COUPON_TYPE() {
    return COUPON_TYPE;
  }

  /**
   * Generate payment signature
   * @param {object} params
   * @param {string=} signType
   * @param {Boolean=} sandbox gen sign for retrieve sandbox sign key
   * @return {object} signature object
   */
  generateSignature(params, signType, sandbox) {
    const data = this.generateGeneralPaymentSignature(
      params,
      signType || SIGN_TYPE.MD5,
      sandbox
    );
    return Object.assign({}, data.params, { sign: data.paySign });
  }

  /**
   * Generate paySign info for jssdk to invoke wechat payment
   * @param {string} prepayId received from unifiedOrder()
   * @param {string=} signType MD5 or SHA1, default MD5
   * @return {Promise}
   */
  generateChooseWXPayInfo(prepayId, signType) {
    const params = {
      appId: this.wechatConfig.appId,
      timeStamp: utils.timestamp(),
      nonceStr: utils.nonceStr(),
      package: 'prepay_id=' + prepayId,
      signType: signType || SIGN_TYPE.MD5,
    };
    const ret = this.generateGeneralPaymentSignature(params, params.signType);
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
   * @param {object} params data used to gen payment sign
   * @param {string} signType
   * @param {boolean=} sandbox if gen the sign to get sandbox api key
   * @return {object}
   */
  generateGeneralPaymentSignature(params, signType, sandbox) {
    const originalKeys = Object.keys(params);
    const keys = originalKeys.filter(key => {
      const val = params[key];
      return (
        typeof key === 'string' &&
        val !== undefined &&
        val !== '' &&
        val !== null
      );
    });
    const newParams = {};
    keys.forEach(key => {
      newParams[key] = params[key];
    });
    // console.log(utils.buildXML(Object.assign({key: this.wechatConfig.paymentKey}, params))
    //   .then(xml => console.log(xml)));
    let str = utils.paramsToString(newParams, true);
    const key = this.getAPISignKey(sandbox);
    str += '&key=' + key;
    // console.log(params);
    console.log(str);
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
  getAgentOptions() {
    const wc = this.wechatConfig;
    return {
      pfx: wc.paymentCertificatePfx,
      passphrase: wc.paymentPassphrase || wc.merchantId,
      securityOptions: 'SSL_OP_NO_SSLv3',
    };
  }

  /**
   * Generate simple trade id
   * @return {string}
   */
  simpleTradeNo() {
    return utils.simpleDate() + utils.nonceStr().toUpperCase();
  }

  /**
   * Generate unified order from wechat
   * @param {object} orderInfo
   * @return {Promise}
   */
  unifiedOrder(orderInfo) {
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
      orderInfo
    );
    return this.simpleRequest(this.paymentUrls.UNIFIED_ORDER, data)
      .then(result => {
        const responseData = result.responseData;
        if (!responseData.out_trade_no) {
          responseData.out_trade_no = data.out_trade_no;
        }
        debug('unified result ok');
        return Promise.resolve(result);
      })
      .catch(reason => {
        console.error(reason);
        debug('get unified order failed!');
        return Promise.reject(reason);
      });
  }

  /**
   * Query specific order status from wechat
   * @param {object} queryInfo
   * @return {Promise}
   */
  queryOrder(queryInfo) {
    return this.simpleRequest(this.paymentUrls.QUERY_ORDER, queryInfo).catch(
      reason => {
        debug('query order failed!');
        return Promise.reject(reason);
      }
    );
  }

  /**
   * Close order from wechat
   * @param {string} orderId wechat out_trade_no
   * @return {Promise}
   */
  closeOrder(orderId) {
    return this.simpleRequest(this.paymentUrls.CLOSE_ORDER, {
      out_trade_no: orderId,
    }).catch(reason => {
      debug('close order failed!');
      return Promise.reject(reason);
    });
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
  refund(info) {
    const data = this.generateSignature(this.mergeParams(info));
    return utils
      .buildXML(data)
      .then(xmlData => {
        return utils.sendWechatPaymentRequest({
          url: this.paymentUrls.REFUND,
          body: xmlData,
          agentOptions: this.getAgentOptions(),
        });
      })
      .then(jsonData => {
        return Promise.resolve(jsonData);
      })
      .catch(reason => {
        debug('request refund operation failed!');
        return Promise.reject(reason);
      });
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
  queryRefund(info) {
    return this.simpleRequest(this.paymentUrls.QUERY_REFUND, info).catch(
      reason => {
        debug('query refund failed!');
        return Promise.reject(reason);
      }
    );
  }

  /**
   * Download bill from wechat
   * @param {string} billDate e.g: 20180603
   * @param {string} billType e.g: FUND_ACCOUNT_TYPE.BASIC
   * @param {boolean=} noGzip if download stream is gziped
   * @return {Promise}
   */
  downloadBill(billDate, billType, noGzip) {
    const data = this.generateSignature(
      this.mergeParams({
        bill_date: billDate,
        bill_type: billType || BILL_TYPE.ALL,
        tar_type: noGzip ? '' : 'GZIP',
      })
    );
    return this.download(data, {
      gzip: !noGzip,
    });
  }

  /**
   * Download fund flow
   * @param {string} billDate e.g: 20180603
   * @param {string} accountType e.g: BILL_TYPE.ALL
   * @param {boolean=} noGzip if download stream is gziped
   * @return {Promise}
   */
  downloadFundFlow(billDate, accountType, noGzip) {
    const data = this.generateSignature(
      this.mergeParams(
        {
          bill_date: billDate,
          account_type: accountType,
          tar_type: noGzip ? '' : 'GZIP',
        },
        SIGN_TYPE.HMAC_SHA256
      ),
      SIGN_TYPE.HMAC_SHA256
    );
    return this.download(data, {
      agentOptions: this.getAgentOptions(),
      gzip: !noGzip,
    });
  }

  /**
   * Download functionality
   * @param {object} data request data
   * @param {object=} requestOptions options send to request
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
  download(data, requestOptions) {
    return utils.buildXML(data).then(xmlData => {
      const myOptions = Object.assign(
        {
          strictSSL: false,
          json: false,
          gzip: true,
          method: 'POST',
          url: this.paymentUrls.DOWNLOAD_FUND_FLOW,
          body: xmlData,
        },
        requestOptions
      );
      return new Promise((resolve, reject) => {
        const stream = request(myOptions, (error, response, body) => {
          if (error) {
            debug(error);
            reject({ error: error });
            return;
          }
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
            digest: response.headers['digest'],
          });
        });
      });
    });
  }

  /**
   * Report wechat services status to wechat
   * @param {object} info
   * @return {Promise}
   */
  reportToWechat(info) {
    return this.simpleRequest(this.paymentUrls.REPORT, info).catch(reason => {
      debug('report status to wechat failed!');
      return Promise.reject(reason);
    });
  }

  getSandboxSignKey() {
    const params = {
      mch_id: this.wechatConfig.merchantId,
      nonce_str: utils.nonceStr(),
    };
    const data = this.generateSignature(params, SIGN_TYPE.MD5, true);
    return utils
      .buildXML(data)
      .then(xmlData => {
        console.log('sandbox key request:', xmlData);
        return utils.sendWechatPaymentRequest({
          url: this.paymentUrls.SIGN_KEY,
          body: xmlData,
        });
      })
      .then(rawData => {
        console.log(rawData);
        return utils.parseXML(rawData);
      })
      .then(jsonData => {
        this.wechatConfig.paymentSandBoxKey = jsonData.sandbox_signkey;
        return Promise.resolve(jsonData);
      })
      .catch(reason => {
        debug('get sandbox sign key failed!');
        return Promise.reject(reason);
      });
  }

  /**
   * Simplified request wrapper
   * @param {string} apiUrl
   * @param {object} info
   * @param {Number=} attempts, sandbox key error retry count
   * @return {Promise}
   */
  simpleRequest(apiUrl, info, attempts) {
    if (attempts > MAX_SANDBOX_SIGN_KEY_ERROR_ATTEMPTS) {
      const msg = 'maximum sandbox key error attempts reached!';
      debug(msg);
      return Promise.reject(new Error(msg));
    }
    if (!attempts) {
      attempts = 1;
    }
    const data = this.generateSignature(this.mergeParams(info));
    // console.log(data);
    // return utils.buildXML(data)
    //   .then(data => {
    //     console.log(data);
    //     return utils.parseXML(data);
    //   });
    return utils
      .buildXML(data)
      .then(xmlData => {
        // console.log(xmlData);
        return utils.sendWechatPaymentRequest({
          url: apiUrl,
          body: xmlData,
        });
      })
      .then(rawData => {
        console.log('wechat response:', rawData);
        return utils.parseXML(rawData);
      })
      .then(jsonData => {
        if (jsonData.return_code == RESULT_CODE.FAIL) {
          debug(jsonData.return_msg);
          //sandbox key error, try get new key and try one more time
          if (
            String(jsonData.return_msg).indexOf(SANDBOX_SIGN_KEY_ERROR_MSG) >= 0
          ) {
            debug(
              'sandbox sign key error, try get new key and try one more time...'
            );
            return this.getSandboxSignKey().then(() => {
              return this.simpleRequest(apiUrl, info, attempts + 1);
            });
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
      });
  }

  /**
   * Merge custom params with default params
   * @param customParams
   * @param signType
   * @return {object}
   */
  mergeParams(customParams, signType) {
    const wechatConfig = this.wechatConfig;
    return Object.assign(
      {
        appid: wechatConfig.appId,
        mch_id: wechatConfig.merchantId,
        nonce_str: utils.nonceStr(),
        sign_type: signType || SIGN_TYPE.MD5,
      },
      customParams
    );
  }

  /**
   * Parse xml data notified by wechat server
   * @param data
   * @return {Promise}
   */
  parseNotifyData(data) {
    return utils.parseXML(data);
  }

  /**
   * Get xml reply data based on success or fail
   * @param {boolean} isSuccess
   * @return {Promise}
   */
  replyData(isSuccess) {
    const result = {
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
  getDownloadBillDate(date) {
    return utils.simpleDate(date, 'yyyymmdd');
  }

  /**
   * Get api key based on env
   * @param {Boolean=} getSandboxKey the sandbox api key should also use the original payment api key
   * @return {*}
   */
  getAPISignKey(getSandboxKey) {
    return getSandboxKey || !this.wechatConfig.paymentSandBox
      ? this.wechatConfig.paymentKey
      : this.wechatConfig.paymentSandBoxKey;
  }

  /**
   * Decrypt wechat refund notify result
   * @see https://pay.weixin.qq.com/wiki/doc/api/jsapi.php?chapter=9_16&index=10
   * @param {string} xmlResult notify xml data
   * @return {Promise}
   */
  decryptRefundNotifyResult(xmlResult) {
    return utils.parseXML(xmlResult).then(data => {
      const md5Key = utils.genMD5(this.getAPISignKey());
      const cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: CryptoJS.enc.Base64.parse(data.req_info),
      });
      const bytes = CryptoJS.AES.decrypt(
        cipherParams,
        CryptoJS.enc.Hex.parse(utils.createBuffer(md5Key).toString('hex')),
        {
          mode: CryptoJS.mode.ECB,
          padding: CryptoJS.pad.Pkcs7,
        }
      );
      const ret = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
      return Promise.resolve({
        parsedXMLData: data,
        decryptedData: ret,
      });
    });
  }

  /**
   * Batch query user comments
   * @param {string} beginTime in format 'yyyyMMddHHmmss'
   * @param {string} endTime same as beginTime
   * @param {number=} offset integer
   * @param {number=} limit integer
   * @return {Promise}
   */
  queryComments(beginTime, endTime, offset, limit) {
    const data = this.generateSignature(
      this.mergeParams(
        {
          begin_time: beginTime,
          end_time: endTime,
          offset: offset || 0,
          limit: limit,
        },
        SIGN_TYPE.HMAC_SHA256
      ),
      SIGN_TYPE.HMAC_SHA256
    );
    return utils
      .buildXML(data)
      .then(xmlData => {
        return utils.sendWechatPaymentRequest({
          url: this.paymentUrls.BATCH_QUERY_COMMENT,
          body: xmlData,
          agentOptions: this.getAgentOptions(),
        });
      })
      .then(data => {
        //not ok if has xml tag
        if (String(data).indexOf('<xml>') >= 0) {
          return utils.parseXML(data).then(parsedData => {
            return Promise.reject(parsedData);
          });
        }
        return Promise.resolve(data);
      })
      .catch(reason => {
        debug('query user comments operation failed!');
        return Promise.reject(reason);
      });
  }
}

module.exports = Payment;
