const bootstrap = require('./bootstrap');

const config = bootstrap.config;
const should = bootstrap.should;

const Wechat = require('../lib');
const JSSDK = Wechat.JSSDK;
const FileStore = Wechat.FileStore;
const MongoStore = Wechat.MongoStore;

const wx = new Wechat(config);

describe('JSSDK', function () {
  beforeEach(function () {
  });

  describe('@constructor()', function () {
    this.timeout(20000);
    it('should use custom store', function(done) {
      new Wechat(Object.assign({
        store: new MongoStore(),
        clearCountInterval: 1000,
      }, config));
      setTimeout(done, 2000);
    });
  });

  describe('#getAccessToken()', function () {
    beforeEach(function () {
      this.timeout(20000);
    });

    it('should get wechat token', function (done) {
      wx.jssdk.getAccessToken().then(function (data) {
        data.should.have.property('access_token');
        done();
      });
    });

    it('should get wechat token failed', function (done) {
      wx.jssdk.wechatConfig.appId = 'invalid_app_id';
      wx.jssdk.getAccessToken()
        //TODO, error should go to catch
        .then((data) => {
          console.log('data: ', data);
        })
        .catch((reason) => {
          console.log(reason);
          reason.shoud.not.have.property('access_token');
        })
        .then(() => {
          done();
        })
    });

  });

  describe('#getSignatureByURL()', function () {
    it('should get signature', function (done) {
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

  describe('#isTokenExpired()', function () {
    it('should be expired for the token', function () {
      const modifyDate = new Date(2016, 11, 11).getTime();
      const expired = JSSDK.isTokenExpired(modifyDate);
      expired.should.be.equal(true);
    });
  });

  describe('#signatureResult()', function () {
    it('should return empty object', function () {
      const result = JSSDK.signatureResult(undefined);
      result.should.be.deep.equal({});
    });
    it('should return filtered object', function () {
      const result = JSSDK.signatureResult({
        timestamp: 'aaa',
        nonceStr: 'bbb',
        signature: 'ccc',
        url: 'http://localhost',
        extra: 'should not include this',
      });
      result.should.not.have.property('extra');
      result.should.have.property('signature').be.equal('ccc');
    });
  });

  describe('#normalizeUrl()', function () {
    it('should return url without hash', function() {
      const baseUrl = 'http://localhost?a=b';
      const url = baseUrl + '#hash';
      const result = JSSDK.normalizeUrl(url);
      result.should.be.equal(baseUrl);
    });
  });

  describe('#verifySignature()', function () {
    it('should pass the signature verification', function() {
      const query = {
        timestamp: 'abc',
        nonce: 'xyz',
        signature: '4241c4733092f8733df37930576473d51aa2cbcc',
      };
      const verified = wx.jssdk.verifySignature(query);
      verified.should.be.equal(true);
    });
  });



});