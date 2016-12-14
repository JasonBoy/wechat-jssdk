const bootstrap = require('./bootstrap');

const config = bootstrap.config;
const should = bootstrap.should;

const Wechat = require('../lib');
const OAuth = Wechat.OAuth;

const wx = new Wechat(config);

const mockToken = {
  "access_token": "ACCESS_TOKEN",
  "expires_in": 7200,
  "refresh_token": "REFRESH_TOKEN",
  "openid": "OPENID",
  "scope": "SCOPE",
};

describe('OAuth', function () {
  describe('@constructor()', function () {
    this.timeout(20000);
    it('should instantiate with custom refresh interval', function(done) {
      new Wechat(Object.assign({
        refreshAccessTokenInterval: 1000,
      }, config));
      setTimeout(done, 2000);
    });
  });

  describe('#getUserInfo()', function () {
    this.timeout(20000);
    it('should fail getting user info', function (done) {
      wx.oauth.getUserInfo('invalid_code', true)
        .catch((result) => {
          result.errcode.should.not.equal(0);
          result.errmsg.should.not.equal('ok');
          done();
        });
    });
  });

  describe('#getUserInfoWithToken()', function () {
    this.timeout(20000);
    it('should fail getting user info with token', function (done) {
      wx.oauth.getUserInfoWithToken({
          access_token: 'invalid_code',
          openid: 'openid'
        }, true)
        .catch((result) => {
          result.errcode.should.not.equal(0);
          result.errmsg.should.not.equal('ok');
          done();
        });
    });
  });

  describe('#getUserInfoByOptions()', function () {
    this.timeout(20000);
    it('should fail getting user info by options', function (done) {
      wx.oauth.getUserInfoByOptions({code: 'invalid_code'})
        .catch((result) => {
          result.errcode.should.not.equal(0);
          result.errmsg.should.not.equal('ok');
          done();
        });
    });
  });

  describe('#getUserBaseInfo()', function () {
    this.timeout(20000);
    it('should fail getting base info', function (done) {
      wx.oauth.getUserBaseInfo('invalid_code')
        .catch((result) => {
          result.errcode.should.not.equal(0);
          result.errmsg.should.not.equal('ok');
          done();
        });
    });
  });

  describe('#getOAuthAccessToken()', function () {
    this.timeout(20000);
    it('should fail getting access token', function (done) {
      wx.oauth.getOAuthAccessToken('invalid_code')
        .catch((result) => {
          result.errcode.should.not.equal(0);
          result.errmsg.should.not.equal('ok');
          done();
        });
    });
  });

  describe('#refreshAccessToken()', function () {
    this.timeout(20000);
    it('should get undefined result', function (done) {
      wx.oauth.oauthAccessToken = {};
      wx.oauth.refreshAccessToken()
        .catch((result) => {
          result.errcode.should.not.equal(0);
          result.errmsg.should.not.equal('ok');
          done();
        });
    });
  });

  describe('#isAccessTokenValid()', function () {
    this.timeout(20000);
    it('should get error message', function (done) {
      wx.oauth.oauthAccessToken = {};
      wx.oauth.isAccessTokenValid()
        .catch((result) => {
          result.errcode.should.not.equal(0);
          result.errmsg.should.not.equal('ok');
          done();
        });
    });
  });

  describe('#setExpirationTime()', function () {
    it('should just return if token info not specified', function() {
      OAuth.setExpirationTime({});
    });
    it('should set the expiration time', function() {
      const temp = Object.assign({}, mockToken);
      OAuth.setExpirationTime(temp);
      temp.should.have.property('expirationTime');
    });
  });

  describe('#isTokenExpired()', function () {
    //expirationTime: 1481601476688
    it('should return true if expirationTime not exist', function () {
      wx.oauth.oauthAccessToken = Object.assign({}, mockToken);
      const expired = wx.oauth.isTokenExpired();
      expired.should.be.equal(true);
    });
    it('should return true if expirationTime less than now', function () {
      const temp = Object.assign({}, mockToken);
      temp.expirationTime = 1481601476600;
      wx.oauth.oauthAccessToken = temp;
      const expired = wx.oauth.isTokenExpired();
      expired.should.be.equal(true);
    });
    it('should return false if expirationTime greater than now', function () {
      const temp = Object.assign({}, mockToken);
      temp.expirationTime = Date.now + 3600 * 1000;
      wx.oauth.oauthAccessToken = temp;
      const expired = wx.oauth.isTokenExpired();
      expired.should.be.equal(false);
    });
  });

});
