'use strict';

const utils = require('../lib/utils');

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
    const order = {
      device_info: 'wechat_test_web',
      body: 'ORDER_测试',
      detail: JSON.stringify({ "goods_detail":[ { "goods_id":"iphone6s_16G", "wxpay_goods_id":"1001", "goods_name":"iPhone6s 16G", "quantity":1, "price":528800, "goods_category":"123456", "body":"苹果手机" }, { "goods_id":"iphone6s_32G", "wxpay_goods_id":"1002", "goods_name":"iPhone6s 32G", "quantity":1, "price":608800, "goods_category":"123789", "body":"苹果手机" } ] }),
      attach: '上海分店',
      total_fee: 101,
      spbill_create_ip: '127.0.0.1',
      time_start: utils.simpleDate(now),
      time_expire: utils.simpleDate(nowPlusTwoHours),
      goods_tag: 'wx_test',
      // notify_url: 'http://beautytest.yjyyun.com/payment/',
      // product_id: '',
      // limit_pay: '',
      // openid: info.openId,
      /*scene_info: {
        "id": "SH001",
        "name": "上大餐厅",
        "area_code": "200100",
        "address": "广中路引力楼1楼"
      }*/
    };
    Object.assign(order, info);
    return this.payment.unifiedOrder(order)
      .then(result => {
        // console.log(result);
        return result;
      })
  }

}

module.exports = Order;