var should = require('chai').should();
var wx = require('../lib');

wx.initialize({
  "wechatToken": "6mwdIm9p@Wg7$Oup",
  "appId": "wxfc9c5237ebf480aa",
  "appSecret": "2038576336804a90992b8dbe46cd5948"
});

describe('jssdk', function() {
  describe('#getAccessToken()', function() {
    it('should get wechat token', function(done) {
      this.timeout(20000);
      wx.jssdk.getAccessToken().then(function(data) {
        data.should.have.property('access_token');
        done();
      });
    });
  });
});
