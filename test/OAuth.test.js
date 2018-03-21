'use strict';

const bootstrap = require('./bootstrap');

const config = bootstrap.config;
const should = bootstrap.should;

const Wechat = require('../lib');
const Store = Wechat.Store;
const OAuth = Wechat.OAuth;
const MongoStore = Wechat.MongoStore;

const wx = new Wechat(config);
const wxMongo = new Wechat(
  Object.assign(
    {
      store: new MongoStore(),
    },
    config
  )
);

const mockToken = {
  access_token: 'ACCESS_TOKEN',
  expires_in: 7200,
  refresh_token: 'REFRESH_TOKEN',
  openid: 'OPENID',
  scope: 'SCOPE',
};

//set some mock data
const key = 'mock_key_' + Math.random();
const mockToken2 = {
  key: key,
  access_token: 'ACCESS_TOKEN' + Math.random(),
  expires_in: 7200,
  refresh_token: 'REFRESH_TOKEN' + Math.random(),
  openid: 'OPENID',
  scope: 'SCOPE',
};

describe('OAuth', function() {
  describe('@constructor()', function() {
    this.timeout(20000);
    it('should instantiate with custom refresh interval', function(done) {
      new Wechat(
        Object.assign(
          {
            refreshAccessTokenInterval: 1000,
          },
          config
        )
      );
      setTimeout(done, 2000);
    });
  });

  describe('#getUserInfo()', function() {
    this.timeout(20000);
    it('should fail getting user info', function(done) {
      wx.oauth.getUserInfo('invalid_code').catch(result => {
        result.errcode.should.not.equal(0);
        result.errmsg.should.not.equal('ok');
        done();
      });
    });
  });

  describe('#getUserInfoRemotely()', function() {
    this.timeout(20000);
    it('should fail getting user info with token', function(done) {
      wx.oauth
        .getUserInfoRemotely(
          {
            access_token: 'invalid_code',
            openid: 'openid',
          },
          true
        )
        .catch(result => {
          result.errcode.should.not.equal(0);
          result.errmsg.should.not.equal('ok');
          done();
        });
    });
  });

  describe('#getUserBaseInfo()', function() {
    this.timeout(20000);
    it('should fail getting base info', function(done) {
      wx.oauth.getUserBaseInfo('invalid_code').catch(result => {
        result.errcode.should.not.equal(0);
        result.errmsg.should.not.equal('ok');
        done();
      });
    });
  });

  describe('#getAccessToken()', function() {
    this.timeout(20000);
    it('should fail getting access token', function(done) {
      wx.oauth
        .getAccessToken('invalid_code', 'mock_key_' + Math.random())
        .catch(result => {
          result.errcode.should.not.equal(0);
          result.errmsg.should.not.equal('ok');
          done();
        });
    });

    it('should save access token to store', function(done) {
      OAuth.setAccessTokenExpirationTime(mockToken2);
      wx.oauth.store
        .saveOAuthAccessToken(key, mockToken2)
        .then(tokenInfo => {
          tokenInfo.should.have
            .property('access_token')
            .equal(mockToken2.access_token);
          tokenInfo.should.have.property('openid').equal(mockToken2.openid);
        })
        .then(() => done());
    });

    it('@mongoStore should save access token to store', function(done) {
      OAuth.setAccessTokenExpirationTime(mockToken2);
      wxMongo.oauth.store
        .saveOAuthAccessToken(key, mockToken2)
        .then(tokenInfo => {
          tokenInfo.should.have
            .property('access_token')
            .equal(mockToken2.access_token);
          tokenInfo.should.have.property('openid').equal(mockToken2.openid);
        })
        .then(() => done());
    });

    it('should get access token from store', function(done) {
      wx.oauth.store
        .getOAuthAccessToken(key)
        .then(tokenInfo => {
          tokenInfo.should.have
            .property('access_token')
            .equal(mockToken2.access_token);
          tokenInfo.should.have.property('openid').equal(mockToken2.openid);
        })
        .then(() => done());
    });

    it('@mongoStore should get access token from store', function(done) {
      wxMongo.oauth.store
        .getOAuthAccessToken(key)
        .then(tokenInfo => {
          tokenInfo.should.have
            .property('access_token')
            .equal(mockToken2.access_token);
          tokenInfo.should.have.property('openid').equal(mockToken2.openid);
        })
        .then(() => done());
    });

    it('should get needed access token from store by user', function(done) {
      wx.oauth
        .getAccessToken('', key)
        .then(tokenInfo => {
          tokenInfo.should.have
            .property('access_token')
            .equal(mockToken2.access_token);
          tokenInfo.should.have.property('openid').equal(mockToken2.openid);
        })
        .then(() => done());
    });

    it('@mongoStore should get needed access token from store by user', function(done) {
      wxMongo.oauth
        .getAccessToken('', key)
        .then(tokenInfo => {
          tokenInfo.should.have
            .property('access_token')
            .equal(mockToken2.access_token);
          tokenInfo.should.have.property('openid').equal(mockToken2.openid);
        })
        .then(() => done());
    });

    it('should not get access token', function(done) {
      wx.oauth
        .getAccessToken('', 'mock_key_' + Math.random())
        // .should.be.rejected()
        .catch(err => {
          err.should.be.Error();
        })
        .then(() => done())
        .catch(() => done());
    });

    it('@mongoStore should not get access token', function(done) {
      wxMongo.oauth
        .getAccessToken('', 'mock_key_' + Math.random())
        .catch(err => {
          err.should.be.Error();
        })
        .then(() => done())
        .catch(() => done());
    });

    it('should refresh access token when it is expired', function(done) {
      wx.oauth.store
        .updateOAuthAccessToken(key, {
          expirationTime: Date.now() - 3600000,
        })
        .then(() => {
          return wx.oauth.getAccessToken('', key);
        })
        .catch(tokenInfo => {
          should.not.exist(tokenInfo.access_token);
          should.not.exist(tokenInfo.openid);
        })
        .then(() => done());
    });
  });

  describe('#refreshAccessToken()', function() {
    this.timeout(20000);
    it('should not get new access_token', function(done) {
      wx.oauth.refreshAccessToken('', {}).catch(result => {
        should.not.exist(result.access_token);
        should.not.exist(result.openid);
        done();
      });
    });
    it('should refresh access token directly to store', function(done) {
      const newAccessToken = 'new_access_token';
      wx.oauth.store
        .updateOAuthAccessToken(key, { access_token: newAccessToken })
        .then(newToken => {
          newToken.access_token.should.be.equal(newAccessToken);
          newToken.updated.should.be.equal(true);
        })
        .then(() => done());
    });

    it('@mongoStore should refresh access token directly to store', function(done) {
      const newAccessToken = 'new_access_token';
      wxMongo.oauth.store
        .updateOAuthAccessToken(key, { access_token: newAccessToken })
        .then(newToken => {
          newToken.access_token.should.be.equal(newAccessToken);
          newToken.updated.should.be.equal(true);
        })
        .then(() => done());
    });
  });

  describe('#isAccessTokenValid()', function() {
    this.timeout(20000);
    it('should get error message', function(done) {
      wx.oauth.isAccessTokenValid({}).catch(result => {
        result.errcode.should.not.equal(0);
        result.errmsg.should.not.equal('ok');
        done();
      });
    });
  });

  describe('OAuth.setExpirationTime()', function() {
    it('should just return if token info not specified', function() {
      OAuth.setAccessTokenExpirationTime({});
    });
    it('should set the expiration time', function() {
      const temp = Object.assign({}, mockToken);
      OAuth.setAccessTokenExpirationTime(temp);
      temp.should.have.property('expirationTime');
    });
  });

  describe('OAuth.isAccessTokenExpired()', function() {
    //expirationTime: 1481601476688
    it('should return true if expirationTime not exist', function() {
      const expired = OAuth.isAccessTokenExpired({});
      expired.should.be.equal(true);
    });
    it('should return true if expirationTime less than now', function() {
      const expired = OAuth.isAccessTokenExpired(
        Object.assign(
          {
            expirationTime: 1481601476600,
          },
          mockToken
        )
      );
      expired.should.be.equal(true);
    });
    it('should return false if expirationTime greater than now', function() {
      const expired = OAuth.isAccessTokenExpired(
        Object.assign(
          {
            expirationTime: Date.now() + 3600 * 1000,
          },
          mockToken
        )
      );
      expired.should.be.equal(false);
    });
  });
});
