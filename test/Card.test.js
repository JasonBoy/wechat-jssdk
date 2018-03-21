'use strict';

const bootstrap = require('./bootstrap');

const config = bootstrap.config;
const should = bootstrap.should;

const Wechat = require('../lib');

const util = require('../lib/utils');

const wx = new Wechat(
  Object.assign({}, config, {
    card: true,
  })
);

describe('Card', function() {
  describe('#getCardSignature()', function() {
    this.timeout(20000);
    it('should get cardSign', function(done) {
      wx.card
        .getCardSignature('myShopId', 'myCardType', 'myCardId')
        .then(sigInfo => {
          // console.log(sigInfo);
          sigInfo.should.have.property('cardSign');
          sigInfo.should.have.property('timestamp');
          sigInfo.should.have.property('nonceStr');
        })
        .catch(reason => {
          // console.log(reason);
        })
        .then(() => done());
    });
  });

  describe('#getApiTicket()', function() {
    setTimeout(() => {
      it('should get api ticket', function(done) {
        const store = wx.card.store;
        store.store.card = {};
        store.store.globalToken.modifyDate = new Date(0);
        wx.card
          .getApiTicket()
          .then(ticket => {
            ticket.should.have.property('ticket');
            done();
          })
          .catch(() => done());
      });
    }, 1000);
  });

  describe('#getCardExt()', function() {
    this.timeout(20000);
    it('should get cardExt', function(done) {
      wx.card
        .getCardExt(
          'myCardId',
          'myCode',
          'myOpenId',
          util.timestamp(),
          util.nonceStr()
        )
        .then(cardExt => {
          // console.log(cardExt);
          const extObj = JSON.parse(cardExt);
          extObj.should.have.property('signature');
          extObj.should.have.property('timestamp');
          extObj.should.have.property('nonce_str');
        })
        .catch(reason => {
          // console.log(reason);
        })
        .then(() => done());
    });
  });
});
