let should = require('chai').should();
const Wechat = require('../lib');
const config = {
  "wechatToken": "6mwdIm9p@Wg7$Oup",
  "appId": "wxfc9c5237ebf480aa",
  "appSecret": "2038576336804a90992b8dbe46cd5948",
};

const wx = new Wechat(config);

describe('jssdk', function () {
  describe('#getAccessToken()', function () {
    it('should get wechat token', function (done) {
      this.timeout(20000);
      wx.jssdk.getAccessToken().then(function (data) {
        data.should.have.property('access_token');
        done();
      });
    });
  });
  describe('#getSignatureByURL()', function () {
    it('should get signature', function (done) {
      this.timeout(20000);
      const url = 'http://localhost?test_signature';
      wx.jssdk.getSignatureByURL(url)
        .then(function (signature) {
          signature.should.be.an('object');
          signature.should.have.property('url').equal(url);
          signature.should.have.property('nonceStr');
          signature.should.have.property('signature');
          signature.should.have.property('timestamp');
          done();
        });
    });
  });
});
