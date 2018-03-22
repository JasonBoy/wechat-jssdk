'use strict';

const debug = require('debug')('wechat-Order');
const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const isEmpty = require('lodash.isempty');

const adapter = new FileSync(path.join(__dirname, '../db_demo.json'));
const db = low(adapter);

const utils = require('../lib/utils');
const Payment = require('../lib/Payment');

db
  .defaults({
    //our own system orders
    orders: [],
    //wechat unified orders
    unifiedOrders: [],
    //wechat notified order states
    wechatOrders: [],
    //refund
    refundOrders: [],
    //save wechat payment notify result
    wechatNotifyOrders: [],
    wechatNotifyRefunds: [],
  })
  .write();

const defaultInfo = {
  device_info: 'wechat_test_web',
  body: `ORDER_测试`,
  detail: JSON.stringify({
    goods_detail: [
      {
        goods_id: 'iphone6s_16G',
        wxpay_goods_id: '1001',
        goods_name: 'iPhone6s 16G',
        quantity: 1,
        price: 528800,
        goods_category: '123456',
        body: '苹果手机',
      },
    ],
  }),
  attach: '上海分店',
  total_fee: '101',
  spbill_create_ip: '127.0.0.1',
  // time_start: utils.simpleDate(now),
  // time_expire: utils.simpleDate(nowPlusTwoHours),
  // goods_tag: 'wx_test',
  trade_type: Payment.PAYMENT_TYPE.JSAPI,
  // notify_url: 'http://beautytest.yjyyun.com/payment/',
  // product_id: '',
  // limit_pay: '',
  // openid: info.openId,
  scene_info: JSON.stringify({
    id: 'SH001',
    name: '上大餐厅',
    area_code: '200100',
    address: '广中路引力楼1楼',
  }),
};

/**
 * A demo implementation for order & payment
 */
class Order {
  constructor(options) {
    this.payment = options.payment;
  }

  createOrderCase1(info) {
    const now = new Date();
    const order = Object.assign({}, defaultInfo, {
      body: defaultInfo.body + '_1',
      time_start: utils.simpleDate(now),
      total_fee: '101',
      // goods_tag: 'wx_test',
    }, info);
    return this.createOrder(order);
  }

  createOrderCase2(info) {
    const now = new Date();
    const order = Object.assign({}, defaultInfo, {
      body: defaultInfo.body + '_2',
      time_start: utils.simpleDate(now),
      total_fee: '102',
      goods_tag: 'wx_test',
    }, info);
    return this.createOrder(order);
  }

  createOrderCase3(info) {
    const now = new Date();
    const order = Object.assign({}, defaultInfo, {
      body: defaultInfo.body + '_3',
      time_start: utils.simpleDate(now),
      total_fee: '130',
      goods_tag: 'wx_test',
    }, info);
    return this.createOrder(order);
  }

  createOrderCase4(info) {
    const now = new Date();
    const order = Object.assign({}, defaultInfo, {
      body: defaultInfo.body + '_4',
      time_start: utils.simpleDate(now),
      total_fee: '131',
      goods_tag: 'wx_test',
    }, info);
    return this.createOrder(order);
  }

  createOrderCase5(info) {
    const now = new Date();
    const order = Object.assign({}, defaultInfo, {
      body: defaultInfo.body + '_5',
      time_start: utils.simpleDate(now),
      total_fee: '132',
      goods_tag: 'wx_test',
    }, info);
    return this.createOrder(order);
  }

  createOrderCase6(info) {
    const now = new Date();
    const order = Object.assign({}, defaultInfo, {
      body: defaultInfo.body + '_6',
      time_start: utils.simpleDate(now),
      total_fee: '133',
      goods_tag: 'wx_test',
    }, info);
    return this.createOrder(order);
  }

  createOrderCase7(info) {
    const now = new Date();
    const order = Object.assign({}, defaultInfo, {
      body: defaultInfo.body + '_7',
      time_start: utils.simpleDate(now),
      total_fee: '134',
      goods_tag: 'wx_test',
    }, info);
    return this.createOrder(order);
  }

  //optional
  createOrderCase8(info) {
    const now = new Date();
    const order = Object.assign({}, defaultInfo, {
      body: defaultInfo.body + '_8',
      time_start: utils.simpleDate(now),
      total_fee: '179',
      goods_tag: 'wx_test',
    }, info);
    return this.createOrder(order);
  }

  createOrder(order) {
    return this.payment
      .unifiedOrder(order)
      .then(result => {
        const requestData = Object.assign(
          { id: result.requestData.out_trade_no },
          result.requestData
        );
        const responseData = Object.assign(
          { id: result.responseData.out_trade_no },
          result.responseData
        );
        const hasOrder = db
          .get('orders')
          .find({ id: requestData.id })
          .has('id')
          .value();
        if (hasOrder) {
        } else {
          db
            .get('orders')
            .push(requestData)
            .write();
          db
            .get('unifiedOrders')
            .push(responseData)
            .write();
          debug('add new order & unified order finished!');
        }
        return Promise.resolve(responseData);
      })
      .then(data => {
        return this.payment
          .generateChooseWXPayInfo(data.prepay_id)
          .then(chooseWXPayData => {
            console.log('parsed data:', data);
            console.log('WXpaydata data:', chooseWXPayData);
            return Promise.resolve({
              orderId: data.out_trade_no,
              chooseWXPay: chooseWXPayData,
            });
          });
      });
  }

  queryOrder(tradeNo) {
    return this.payment
      .queryOrder({
        out_trade_no: tradeNo,
      })
      .then(result => {
        const temp = Object.assign(
          { id: result.responseData.out_trade_no },
          result.responseData
        );
        db
          .get('wechatOrders')
          .push(temp)
          .write();
        debug('write wechat query order finished!');
        return Promise.resolve(result);
      });
  }

  getOrderFromDB(tradeNo) {
    return db.get('orders')
      .find({id: tradeNo})
      .value()
      ;
  }

  updateNotifyResult(data) {
    const order = db
      .get('wechatNotifiesOrders')
      .find({ id: data.out_trade_no })
      .value();
    db
      .get('orders')
      .find({ id: data.out_trade_no })
      .assign({processed: true})
      .value();

    if (!isEmpty(order)) {
      if (order.processed) return;
      //update existing order info
      db
        .get('wechatNotifiesOrders')
        .find({ id: data.out_trade_no })
        .assign(data)
        .write();
      return;
    }
    const temp = Object.assign(
      { id: data.out_trade_no, processed: true },
      data
    );
    db
      .get('wechatNotifiesOrders')
      .push(temp)
      .write();
  }

  updateNotifyRefundResult(data) {
    const order = db
      .get('wechatNotifyRefunds')
      .find({ id: data.out_trade_no })
      .value();
    if (!isEmpty(order)) {
      if (order.processed) return;
      //update existing order info
      db
        .get('wechatNotifyRefunds')
        .find({ id: data.out_trade_no })
        .assign(data)
        .write();
      return;
    }
    const temp = Object.assign(
      { id: data.out_trade_no, processed: true },
      data
    );
    db
      .get('wechatNotifyRefunds')
      .push(temp)
      .write();
  }
}

module.exports = Order;
