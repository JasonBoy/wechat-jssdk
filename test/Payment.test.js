'use strict';

const bootstrap = require('./bootstrap');

const config = bootstrap.config;
const should = bootstrap.should;

const Wechat = require('../lib');
const Payment = Wechat.Payment;
const util = require('../lib/utils');

describe('Payment', function () {

  const customNotifyUrl = 'http://custom.com/api/wechat/payment/';
  const sandboxUnifiedOrder = 'https://api.mch.weixin.qq.com/sandboxnew/pay/unifiedorder';
  describe('@constructor', function () {
    it('should successfully init the Payment instance', function (done) {
      const payment = new Payment(Object.assign({}, config, {
        paymentSandBox: true,
        paymentNotifyUrl: customNotifyUrl,
      }));
      payment.notifyUrl.should.equal(customNotifyUrl);
      payment.paymentUrls.UNIFIED_ORDER.should.equal(sandboxUnifiedOrder);
      done();
    });
  });

});