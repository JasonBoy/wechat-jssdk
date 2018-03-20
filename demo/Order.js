'use strict';

const debug = require('debug')('wechat-Order');
const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync(path.join(__dirname, '../db_demo.json'));
const db = low(adapter);

const utils = require('../lib/utils');

db.defaults(
  {
    //our own system orders
    orders: [],
    //wechat unified orders
    unifiedOrders: [],
    //wechat notified order states
    wechatOrders: [],
  }
  ).write();

/**
 * A demo implementation for order & payment
 */
class Order {

  constructor(options) {
    this.payment = options.payment;
  }

  createOrder(info) {
    const now = new Date;
    const now2 = new Date;
    const hour = now2.getHours();
    const nowPlusTwoHours = now2.setHours(hour + 2);
    const temp = utils.nonceStr();
    const order = {
      device_info: 'wechat_test_web',
      body: `ORDER_测试_${temp}`,
      detail: JSON.stringify({
        "details_id": temp,
        "goods_detail": [
          {
            "goods_id": "iphone6s_16G",
            "wxpay_goods_id": "1001",
            "goods_name": "iPhone6s 16G",
            "quantity": 1,
            "price": 528800,
            "goods_category": "123456",
            "body": "苹果手机"
          },
        ]
      }),
      attach: '上海分店',
      total_fee: '101',
      spbill_create_ip: '127.0.0.1',
      time_start: utils.simpleDate(now),
      time_expire: utils.simpleDate(nowPlusTwoHours),
      goods_tag: 'wx_test',
      // notify_url: 'http://beautytest.yjyyun.com/payment/',
      // product_id: '',
      // limit_pay: '',
      // openid: info.openId,
      scene_info: JSON.stringify({
        "id": "SH001",
        "name": "上大餐厅",
        "area_code": "200100",
        "address": "广中路引力楼1楼"
      })
    };
    Object.assign(order, info);
    return this.payment.unifiedOrder(order)
      .then(result => {
        const requestData = Object.assign({id: result.requestData.out_trade_no}, result.requestData);
        const responseData = Object.assign({id: result.responseData.out_trade_no}, result.responseData);
        const hasOrder = db.get('orders')
          .find({id: requestData.id})
          .has('id')
          .value();
        if(hasOrder) {

        } else {
          db.get('orders')
            .push(requestData)
            .write();
          db.get('unifiedOrders')
            .push(responseData)
            .write();
          debug('add new order & unified order finished!');
        }
        return Promise.resolve(responseData);
      })
      .then(data => {
        return this.payment.generatePaySign(data.prepay_id)
          .then(chooseWXPayData => {
            console.log('parsed data:', data);
            console.log('WXpaydata data:', chooseWXPayData);
            return Promise.resolve({
              orderId: data.out_trade_no,
              chooseWXPay: chooseWXPayData,
            });
          })
      })
  }

  queryOrder (tradeNo) {
    return this.payment.queryOrder({
      out_trade_no: tradeNo
    })
      .then(result => {
        const temp = Object.assign({id: result.responseData.out_trade_no}, result.responseData);
        db.get('wechatOrders')
          .push(temp)
          .write();
        debug('write wechat query order finished!');
        return Promise.resolve(result);
      })
  }

}

module.exports = Order;