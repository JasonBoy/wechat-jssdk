'use strict';

const debug = require('debug')('wechat-Card');
const Promise = require('bluebird');
const isEmpty = require('lodash.isempty');

const util = require('./utils');
const config = require('./config');

const Store = require('./store/Store');
const FileStore = require('./store/FileStore');

const wxConfig = config.getDefaultConfiguration();

let paymentUrls = wxConfig.paymentUrls;

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
    this.paymentUrls = Object.assign({}, paymentUrls, this.wechatConfig.paymentUrls);
    if(this.wechatConfig.paymentSandBox) {
      this.paymentUrls = util.paymentUrlsWithSandBox(this.paymentUrls);
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

}

module.exports = Payment;