'use strict';

const bootstrap = require('./bootstrap');
const config = bootstrap.config;

const Wechat = require('../lib');

describe('index', function() {
  it('should get OAuth class', function() {
    const OAuth = Wechat.OAuth;
    OAuth.constructor.name.should.be.equal('Function');
    new OAuth(config).constructor.name.should.be.equal('OAuth');
  });

  it('should get JSSDK class', function() {
    const JSSDK = Wechat.JSSDK;
    JSSDK.constructor.name.should.be.equal('Function');
    new JSSDK(config).constructor.name.should.be.equal('JSSDK');
  });

  it('should get Store class', function() {
    const Store = Wechat.Store;
    Store.constructor.name.should.be.equal('Function');
    new Store(config).constructor.name.should.be.equal('Store');
  });
});
