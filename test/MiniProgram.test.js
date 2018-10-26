'use strict';

const bootstrap = require('./bootstrap');

const config = bootstrap.config;
const should = bootstrap.should;

const { MiniProgram } = require('../lib');
const mpConfig = {
  appId: 'wxeb9dbcfcd5015935',
  appSecret: '23aeb29179539e43dea19fbdc409a117',
};

const mp = new MiniProgram({
  appId: 'gongzhonghao_appId',
  appSecret: 'gongzhonghao_appSecret',
  miniProgram: mpConfig,
});

const mock = {
  errMsg: 'getUserInfo:ok',
  rawData:
    '{"nickName":"jason","gender":1,"language":"en","city":"Jing","province":"Shanghai","country":"China","avatarUrl":"https://wx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJTl0Fa4Pzo4jMq5DoIZia7geHq15C1iapVWE57mIyqSoqq3T8LzavQtEpabaKn6UzSKxogEvs8hic0A/132"}',
  userInfo: {
    nickName: 'jason',
    gender: 1,
    language: 'en',
    city: 'Jing',
    province: 'Shanghai',
    country: 'China',
    avatarUrl:
      'https://wx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJTl0Fa4Pzo4jMq5DoIZia7geHq15C1iapVWE57mIyqSoqq3T8LzavQtEpabaKn6UzSKxogEvs8hic0A/132',
  },
  signature: '59f8338219f036c32d048b6ff28e36f5bb70589e',
  encryptedData:
    'Itpx4bsAwofdR2mDIjuA1LKh8iBLxxq6UKmuH498QU7kAjNekkBAVUNCENq/urgvH1Hm47gevYWnZaTj1dOZIoHq1eueKtdpaFKD+akBbm+c7HP/PjRR87O99cJk0zgVogplnKkZWJT6IX4rai7IaSG5fIZNTAHflCmXcmSQPQtV4+kEvRPtigiTfgseLGhKhzBgM5JbeyYhYH6kqCYfigUgG88o1cENCYCylD5dSh6+zTvvpqHsgsCOtLTHunQClvuhmHiMWgx6Z+DPq5kQg+IcpelxbIlW1DLsRkqk8LWKeYRrR0AesGDDn9Pb34sOznIF5Ii2UsMtameGMEZeUMtxDAVDPf46GwAqxcRP2LtOx3xW1OZow/FJgyFmG7T1BHZahGd0Ge+j1bG/hyZDEGm62+hCI2NXkQkGxtgss21EJgyLBEPnZ/mrIGFPYN3qiZk0zLLgDiMmuSFc+UCeGw==',
  iv: 's8gf9aH5iVIJmmpowjrrUw==',
};

const code = '081LGZDT0Aad3X1hvMET0Ze7ET0LGZDW';

const mockSession = {
  session_key: 'Bs/KPAI6f2l8UfxSBRVPxA==',
  openid: 'o0ZEQ5YfjRe33Z_ncEI34FAgQX7s',
};

describe('MiniProgram', function() {
  describe('@constructor', function() {
    it('should successfully init the MiniProgram instance', function(done) {
      mp.appId.should.equal(mpConfig.appId);
      mp.appSecret.should.equal(mpConfig.appSecret);
      done();
    });
  });

  // describe('#getSession()', function() {
  //   it('should get the session_key & openid', function(cb) {
  //     mp.getSession(code)
  //       .then(ret => {
  //         console.log(ret);
  //         cb();
  //       })
  //       .catch(err => {
  //         cb(err);
  //       })
  //   });
  // });

  // describe('#genSignature()', function() {
  //   it('should generate signature', function(cb) {
  //
  //   });
  // });

  describe('#verifySignature()', function() {
    it('should verify the signature', function(cb) {
      mp.genSignature(mock.rawData, mockSession.session_key)
        .then(sig => {
          // console.log('sig: ', sig);
          sig.should.equal(mock.signature);
          cb();
        })
        .catch(err => {
          console.error(err);
          cb(err);
        });
    });
  });

  describe('#decryptData()', function() {
    it('should decrypt the received encrypted data', function(cb) {
      mp.decryptData(mock.encryptedData, mock.iv, mockSession.session_key)
        .then(ret => {
          // console.log(ret);
          ret.watermark.appid.should.equal(mpConfig.appId);
          ret.openId.should.equal(mockSession.openid);
          cb();
        })
        .catch(err => {
          console.error(err);
          cb(err);
        });
    });
  });
});
