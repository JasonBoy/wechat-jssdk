'use strict';

const debug = require('debug')('wechat-Payment');
const Promise = require('bluebird');
const isEmpty = require('lodash.isempty');

const utils = require('./utils');
const config = require('./config');

const Store = require('./store/Store');
const FileStore = require('./store/FileStore');

const wxConfig = config.getDefaultConfiguration();

let paymentUrls = wxConfig.paymentUrls;

const signType = {
  'MD5': 'MD5',
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

class Payment {

  /**
   * Wechat Payment class
   * @constructor
   * @param options
   * @return {Payment} Payment instance
   */
  constructor (options) {

    config.checkPassedConfiguration(options);

    this.wechatConfig = isEmpty(options) ? wxConfig : Object.assign({}, wxConfig, options);
    if(!this.wechatConfig.paymentKey) {
      throw new Error('Payment key not found, pls go to wechat payment dashboard to get the key!');
    }
    if(!this.wechatConfig.paymentCertificate) {
      throw new Error('Payment certificate key not found, pls provide pkcs12 key!');
    }
    if(!this.wechatConfig.merchantId) {
      throw new Error('Payment merchant id not found!');
    }

    this.paymentUrls = Object.assign({}, paymentUrls, this.wechatConfig.paymentUrls);
    if(this.wechatConfig.paymentSandBox) {
      this.paymentUrls = utils.paymentUrlsWithSandBox(this.paymentUrls);
    }

    this.notifyUrl = options.paymentNotifyUrl || wxConfig.paymentNotifyUrl;

    if(!options.store || !(options.store instanceof Store)) {
      debug('Store not provided, using default FileStore...');
      this.store = new FileStore(options);
    } else {
      this.store = options.store;
    }

  }

  static fenToYuan (value) {
    return Number(value) / 100; //to yuan
  }

  static yuanToFen (value) {
    //10.123 => 1012
    return Math.floor(Number(value) * 100);
  }

  static formatCurrency (value) {
    //yuan, 10.123 => 10.12, 10 => 10.00, 10.456 => 10.45
    const fen = Payment.yuanToFen(value);
    const yuan = Payment.fenToYuan(fen);
    return yuan.toFixed(2);
  }

  generateSignature (params) {
    const originalKeys = Object.keys(params);
    const keys = originalKeys.filter((key) => {
      return (typeof key === 'string') && (key !== '');
    });
    const newParams = {};
    keys.forEach((key) => {
      newParams[key] = params[key];
    });
    let str = utils.paramsToString(newParams);
    str += '&key=' + this.wechatConfig.paymentKey;
    newParams.sign = utils.genMD5(str).toUpperCase();
    return newParams;
  }


  getAgentOptions () {
    const wc = this.wechatConfig;
    return {
      pfx: wc.paymentCertificate,
      passphrase: wc.paymentPassphrase || wc.merchantId,
    }
  }

  simpleTradeNo () {
    return utils.simpleDate() + utils.nonceStr().toUpperCase();
  }

  unifiedOrder (orderInfo) {
    const data = Object.assign({
      out_trade_no: this.simpleTradeNo(),
      notify_url: this.notifyUrl,
      trade_type: PAYMENT_TYPE.JSAPI,
    }, orderInfo);
    return this.simpleRequest(this.paymentUrls.UNIFIED_ORDER, data)
      .then(result => {
        if(!result.out_trade_no) {
          result.out_trade_no = data.out_trade_no;
        }
        return Promise.resolve(result);
      })
      .catch((reason) => {
        debug('get unified order failed!');
        return Promise.reject(reason);
      });
  }

  queryOrder (queryInfo) {
    return this.simpleRequest(this.paymentUrls.QUERY_ORDER, queryInfo)
      .catch((reason) => {
        debug('query order failed!');
        return Promise.reject(reason);
      });
  }

  closeOrder (info) {
    return this.simpleRequest(this.paymentUrls.CLOSE_ORDER, info)
      .catch((reason) => {
        debug('close order failed!');
        return Promise.reject(reason);
      });
  }

  refund (info) {
    const data = this.generateSignature(this.mergeParams(info));
    return utils.buildXML(data)
      .then(xmlData => {
        return utils.sendWechatPaymentRequest({
          url: this.paymentUrls.REFUND,
          body: xmlData,
          agentOptions: Object.assign({}, this.getAgentOptions()),
        });
      })
      .then(jsonData => {
        return Promise.resolve(jsonData);
      })
      .catch((reason) => {
        debug('request refund operation failed!');
        return Promise.reject(reason);
      })
      ;
  }

  queryRefund (info) {
    return this.simpleRequest(this.paymentUrls.QUERY_REFUND, info)
      .catch((reason) => {
        debug('query refund failed!');
        return Promise.reject(reason);
      });
  }

  downloadBill (info) {
    const data = this.generateSignature(this.mergeParams(info));
    return utils.buildXML(data)
      .then(xmlData => {
        return utils.sendWechatPaymentRequest({
          url: this.paymentUrls.DOWNLOAD_BILL,
          body: xmlData,
        });
      })
      .then(jsonData => {
        return Promise.resolve(jsonData);
      })
      .catch((reason) => {
        debug('query refund failed!');
        return Promise.reject(reason);
      })
      ;
  }

  reportToWechat (info) {
    return this.simpleRequest(this.paymentUrls.REPORT, info)
      .catch((reason) => {
        debug('report status to wechat failed!');
        return Promise.reject(reason);
      });
  }

  simpleRequest (apiUrl, info) {
    const data = this.generateSignature(this.mergeParams(info));
    return utils.buildXML(data)
      .then(xmlData => {
        return utils.sendWechatPaymentRequest({
          url: apiUrl,
          body: xmlData,
        });
      })
      .then(rawData => {
        return utils.parseXML(rawData);
      })
      .then(jsonData => {
        if(jsonData.return_code == RESULT_CODE.FAIL) {
          debug(jsonData.return_msg);
          return Promise.reject(jsonData);
        }
        if(jsonData.result_code == RESULT_CODE.FAIL) {
          debug('ErrorCode[%s]: %s', jsonData.err_code, jsonData.err_code_des);
          return Promise.reject(jsonData);
        }
        return Promise.resolve(jsonData);
      })
      ;
  }

  mergeParams (customParams) {
    const wechatConfig = this.wechatConfig;
    return Object.assign({
      appid: wechatConfig.appId,
      mch_id: wechatConfig.merchantId,
      nonce_str: utils.nonceStr(),
      sign_type: signType.MD5,
    }, customParams);
  }

  parseNotifyData (data) {
    return utils.parseXML(data);
  }

  replyData (isSuccess) {
    const result = {
      return_code: RESULT_CODE.FAIL,
    };
    if(isSuccess) {
      result.return_code = RESULT_CODE.SUCCESS;
      result.return_msg = 'OK';
    }
    return utils.buildXML(result);
  }

}

module.exports = Payment;