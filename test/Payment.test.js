'use strict';

const bootstrap = require('./bootstrap');

const config = bootstrap.config;
const should = bootstrap.should;

const Wechat = require('../lib');
const Payment = Wechat.Payment;
const utils = require('../lib/utils');

describe('Payment', function () {

  const customNotifyUrl = 'http://custom.com/api/wechat/payment/';
  const sandboxUnifiedOrder = 'https://api.mch.weixin.qq.com/sandboxnew/pay/unifiedorder';
  const payment = new Payment(Object.assign({}, config, {
    appId: 'wx2421b1c4370ec43b',
    paymentSandBox: true,
    paymentNotifyUrl: customNotifyUrl,
    // paymentKey: 'test_key',
    paymentKey: '192006250b4c09247ec02edce69f6a2d',
    paymentCertificate: 'test_certificate',
    merchantId: 'test_merchant_id',
  }));
  console.log(payment.paymentUrls);

  describe('@constructor', function () {
    it('should successfully init the Payment instance', function (done) {
      payment.notifyUrl.should.equal(customNotifyUrl);
      payment.paymentUrls.UNIFIED_ORDER.should.equal(sandboxUnifiedOrder);
      done();
    });
  });

  describe('#generateSignature()', function () {
    const params2 = {
      appid: 'wxd930ea5d5a258f4f',
      mch_id: 10000100,
      device_info: 1000,
      body: 'test',
      nonce_str: 'ibuaiVcKdpRxkhJA',
    };

    const params = {
      appid: 'wx2421b1c4370ec43b',
      attach: '支付测试',
      body: 'JSAPI支付测试',
      mch_id: '10000100',
      detail: '{ "goods_detail":[ { "goods_id":"iphone6s_16G", "wxpay_goods_id":"1001", "goods_name":"iPhone6s 16G", "quantity":1, "price":528800, "goods_category":"123456", "body":"苹果手机" }, { "goods_id":"iphone6s_32G", "wxpay_goods_id":"1002", "goods_name":"iPhone6s 32G", "quantity":1, "price":608800, "goods_category":"123789", "body":"苹果手机" } ] }',
      nonce_str: '1add1a30ac87aa2db72f57a2375d8fec',
      notify_url: 'http://wxpay.wxutil.com/pub_v2/pay/notify.v2.php',
      openid: 'oUpF8uMuAJO_M2pxb1Q9zNjWeS6o',
      out_trade_no: '1415659990',
      spbill_create_ip: '14.23.150.211',
      total_fee: '1',
      trade_type: 'JSAPI',
    };
    it('should generate signature for passed parameters', function () {
      const data = payment.generateSignature(params2);
      // data.sign.should.equal('EC00CE08DD7396EF70AE7D659D2A1D3A');
      data.sign.should.equal('9A0A8659F005D6984697E2CA0A9CF3B7');
      utils.buildXML(data).then(info => console.log(info));
      utils.buildXML(params).then(info => console.log(info));
    });
  });

  describe('#generateGeneralPaymentSignature()', function () {
    it('should generate paySign related info', function () {
      //paymentKey: '192006250b4c09247ec02edce69f6a2d',
      const data = payment.generateGeneralPaymentSignature({
        appId: 'wx2421b1c4370ec43b',
        timeStamp: '1395712654',
        nonceStr: 'e61463f8efa94090b1f366cccfbbb444',
        package: 'prepay_id=u802345jgfjsdfgsdg888',
        signType: 'MD5',
      });
      // console.log(data);
      data.should.have.property('paySign').equal('0784A14C2CD35747364F62512E724FD8');
    });
  });

});