'use strict';

const bootstrap = require('./bootstrap');

const should = bootstrap.should;

const Wechat = require('../lib');
const util = require('../lib/utils');
const Store = Wechat.Store;
const FileStore = Wechat.FileStore;
const MongoStore = Wechat.MongoStore;

const fileStore = new FileStore({
  fileStorePath: './wechat-info-' + Math.random() + '.json',
});

const mongoStore = new MongoStore();

describe('FileStore', function() {
  it('should flush the store', function() {
    fileStore.flush();
  });

  it('should failed to flush file store', function(done) {
    fileStore.fileStorePath = './invalid/invalid_path';
    fileStore.flush();
    done();
  });

  it('should destroy the store', function() {
    fileStore.destroy();
  });
});

mongoStore.on('initialized', function() {
  describe('MongoStore', function() {
    this.timeout(20000);
    it('should flush the store', function(done) {
      mongoStore.flush().then(() => done());
    });

    it('should destroy the store', function() {
      mongoStore.destroy();
    });
  });
});

const mongoStore2 = new MongoStore();
mongoStore2.on('initialized', function() {
  const mockUrl = 'http://localhost/?' + Math.random();
  const mockSignature = {
    jsapi_ticket:
      'kgt8ON7yVITDhtdwci0qeX1SvqeQa19KqAy_FSXg0gdhb70VCiKAcZAuaBPolQ5MrotbgGTfKvtOVmcuQ2I4GA',
    nonceStr: 'xxxxx94fufvbmhteeam0',
    timestamp: 'you',
    url: mockUrl,
    signature: 'decc3f47253e4408c1cab0bc1a52ae4edbc6f9b4',
    accessToken:
      'Yfi8sx-m1CPnPA7mjw-UpCNFiRgW_LZl8YMoGyEy0l8I7qPhgJwQCTGWF2LUhZdbRpfZIDI-Tq597LXp7zf0DSz2Wcvsjan9zfZw_rewWczX0fpIM4aE7nPC8nr4g92zNSSeAAAHMM',
    signatureName: mockUrl,
    createDate: '2017-01-01T09:59:11.559Z',
    modifyDate: '2017-01-01T09:59:11.559Z',
  };
  const mockOAuthToken = {
    key: 'mock_key_' + Math.random(),
    access_token: Math.random() + '',
    expires_in: 7200,
    refresh_token: 'REFRESH_TOKEN0.7769256954162849',
    openid: 'OPENID',
    scope: 'SCOPE',
    expirationTime: 1482390009626.0,
  };
  const mockCardTicket = {
    ticket: 'api_ticket_' + Math.random(),
    expires_in: 7200,
    modifyDate: '2016-12-01T09:25:43.781Z',
  };

  describe('MongoStore2', function() {
    this.timeout(20000);

    it('should save new signature to mongodb', function(done) {
      mongoStore2.saveSignature(mockUrl, mockSignature).then(sig => {
        sig.should.have.property('jsapi_ticket');
        done();
      });
    });

    it('should get the saved signature', function(done) {
      setTimeout(() => {
        mongoStore2.getSignature(mockUrl).then(sig => {
          sig.should.have.property('jsapi_ticket');
          sig.should.have.property('url');
          sig.url.should.be.equal(mockUrl);
          done();
        });
      }, 1500);
    });

    it('should get the saved signature from db', function(done) {
      setTimeout(() => {
        delete mongoStore2.store.urls[mockUrl];
        mongoStore2.getSignature(mockUrl).then(sig => {
          sig.should.have.property('jsapi_ticket');
          sig.should.have.property('url');
          sig.url.should.be.equal(mockUrl);
          done();
        });
      }, 2000);
    });

    it('should save new oauth access token to mongodb', function(done) {
      mongoStore2
        .saveOAuthAccessToken(mockOAuthToken.key, mockOAuthToken)
        .then(sig => {
          sig.should.have.property('access_token');
          done();
        });
    });

    it('should update signature to mongodb', function(done) {
      const newSignature = util.nonceStr();
      const newSig = Object.assign({}, mockUrl, { signature: newSignature });
      setTimeout(() => {
        mongoStore2
          .updateSignature(mockUrl, newSig)
          .then(sig => {
            sig.should.have.property('signature');
            sig.signature.should.be.equal(newSignature);
            done();
          })
          .catch(() => done());
      }, 1500);
    });

    it('should get saved oauth access token', function(done) {
      setTimeout(() => {
        mongoStore2
          .getOAuthAccessToken(mockOAuthToken.key)
          .then(tokenInfo => {
            tokenInfo.should.have.property('access_token');
            tokenInfo.key.should.be.equal(mockOAuthToken.key);
            tokenInfo.access_token.should.be.equal(mockOAuthToken.access_token);
            done();
          })
          .catch(() => done());
      }, 1000);
    });

    it('should get saved oauth access token from db', function(done) {
      setTimeout(() => {
        delete mongoStore2.store.oauth[mockOAuthToken.key];
        mongoStore2
          .getOAuthAccessToken(mockOAuthToken.key)
          .then(tokenInfo => {
            tokenInfo.should.have.property('access_token');
            tokenInfo.key.should.be.equal(mockOAuthToken.key);
            tokenInfo.access_token.should.be.equal(mockOAuthToken.access_token);
            done();
          })
          .catch(() => done());
      }, 1500);
    });

    it('should update the oauth access token', function(done) {
      const newToken = util.nonceStr();
      setTimeout(() => {
        mongoStore2
          .updateOAuthAccessToken(mockOAuthToken.key, {
            access_token: newToken,
          })
          .then(newTokenInfo => {
            newTokenInfo.access_token.should.be.equal(newToken);
            done();
          })
          .catch(() => done());
      }, 1500);
    });

    it('should update the global token', function(done) {
      mongoStore2
        .getGlobalToken()
        .then(oldToken => {
          const newToken = {
            accessToken: 'mock_access_token',
          };
          return mongoStore2.updateGlobalToken(newToken).then(updatedToken => {
            updatedToken.should.have.property('accessToken');
            updatedToken.accessToken.should.be.equal('mock_access_token');
            const newCount = oldToken.count + 1;
            newCount.should.be.equal(updatedToken.count);
          });
        })
        .then(() => done())
        .catch(() => done());
    });

    it('should save the card ticket', function(done) {
      mongoStore2
        .updateCardTicket(mockCardTicket)
        .then(cardTicket => {
          cardTicket.ticket.should.be.equal(mockCardTicket.ticket);
          done();
        })
        .catch(() => done());
    });

    it('should get the card ticket', function(done) {
      setTimeout(() => {
        mongoStore2
          .getCardTicket()
          .then(cardTicket => {
            cardTicket.ticket.should.be.equal(mockCardTicket.ticket);
            done();
          })
          .catch(() => done());
      }, 1500);
    });

    it('should update the card ticket', function(done) {
      const newTicket = Object.assign({}, mockCardTicket, {
        ticket: util.nonceStr(),
      });
      setTimeout(() => {
        mongoStore2
          .updateCardTicket(newTicket)
          .then(cardTicket => {
            cardTicket.ticket.should.be.equal(newTicket.ticket);
            done();
          })
          .catch(() => done());
      }, 2000);
    });

    it('should flush in memory data', function(done) {
      setTimeout(() => {
        const store = mongoStore2.store;
        const signatureKeys = Object.keys(store.urls);
        const oauthKeys = Object.keys(store.oauth);
        signatureKeys.forEach(url => {
          store.urls[url].updated = true;
        });
        oauthKeys.forEach(key => {
          store.oauth[key].updated = true;
        });
        mongoStore2.flush().then(() => done());
      }, 4000);
    });
  });
});
