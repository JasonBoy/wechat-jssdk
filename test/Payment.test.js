'use strict';

const bootstrap = require('./bootstrap');

const config = bootstrap.config;
const should = bootstrap.should;

const Wechat = require('../lib');
const Payment = Wechat.Payment;
const utils = require('../lib/utils');

describe('Payment', function() {
  const customNotifyUrl = 'http://custom.com/api/wechat/payment/';
  const sandboxUnifiedOrder =
    'https://api.mch.weixin.qq.com/sandboxnew/pay/unifiedorder';
  const payment = new Payment(
    Object.assign({}, config, {
      appId: 'wx2421b1c4370ec43b',
      paymentSandBox: true,
      paymentNotifyUrl: customNotifyUrl,
      // paymentKey: 'test_key',
      // paymentKey: '192006250b4c09247ec02edce69f6a2d',
      paymentKey: 'c790c109f688b01807617821ed9f1193',
      paymentCertificatePfx: 'test_certificate',
      merchantId: 'test_merchant_id',
    })
  );
  // console.log(payment.paymentUrls);

  describe('@constructor', function() {
    it('should successfully init the Payment instance', function(done) {
      payment.notifyUrl.should.equal(customNotifyUrl);
      payment.paymentUrls.UNIFIED_ORDER.should.equal(sandboxUnifiedOrder);
      done();
    });
  });

  describe('#generateSignature()', function() {
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
      detail:
        '{ "goods_detail":[ { "goods_id":"iphone6s_16G", "wxpay_goods_id":"1001", "goods_name":"iPhone6s 16G", "quantity":1, "price":528800, "goods_category":"123456", "body":"苹果手机" }, { "goods_id":"iphone6s_32G", "wxpay_goods_id":"1002", "goods_name":"iPhone6s 32G", "quantity":1, "price":608800, "goods_category":"123789", "body":"苹果手机" } ] }',
      nonce_str: '1add1a30ac87aa2db72f57a2375d8fec',
      notify_url: 'http://wxpay.wxutil.com/pub_v2/pay/notify.v2.php',
      openid: 'oUpF8uMuAJO_M2pxb1Q9zNjWeS6o',
      out_trade_no: '1415659990',
      spbill_create_ip: '14.23.150.211',
      total_fee: '1',
      trade_type: 'JSAPI',
    };
    it('should generate signature for passed parameters', function() {
      const data = payment.generateSignature(
        params2,
        Payment.SIGN_TYPE.MD5,
        true
      );
      // console.log(data);
      // data.sign.should.equal('EC00CE08DD7396EF70AE7D659D2A1D3A');
      data.sign.should.equal('925DDC574F094D26A39C4A1952B645D1');
      // utils.buildXML(data).then(info => console.log(info));
      // utils.buildXML(params).then(info => console.log(info));
    });
  });

  const paySignData = {
    appId: 'wxee7f6cc5d88ceae6',
    timeStamp: '1521537075',
    nonceStr: '5qrp1lghxau',
    package: 'prepay_id=wx20180320171114464556',
  };

  describe('#generateGeneralPaymentSignature(MD5)', function() {
    it('should generate paySign in MD5', function() {
      //paymentKey: '192006250b4c09247ec02edce69f6a2d',
      const data = payment.generateGeneralPaymentSignature(
        Object.assign(
          {
            signType: Payment.SIGN_TYPE.MD5,
          },
          paySignData
        ),
        Payment.SIGN_TYPE.MD5,
        true
      );
      // console.log(data);
      data.should.have
        .property('paySign')
        .equal('AA044AE801114117CD5008F586A0F32F');
    });
  });

  describe('#generateGeneralPaymentSignature(HMAC-SHA256)', function() {
    it('should generate paySign in HMAC-SHA256', function() {
      //paymentKey: '192006250b4c09247ec02edce69f6a2d',
      const data = payment.generateGeneralPaymentSignature(
        Object.assign(
          {
            signType: Payment.SIGN_TYPE.HMAC_SHA256,
          },
          paySignData
        ),
        Payment.SIGN_TYPE.HMAC_SHA256,
        true
      );
      // console.log(data);
      data.should.have
        .property('paySign')
        .equal(
          'AD97A811D2762EEB24F9565C2EA2176616702627DE606A52C59787D878C52B0C'
        );
    });
  });
});
