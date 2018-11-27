'use strict';

const bootstrap = require('./bootstrap');
const config = bootstrap.config;

const { OAuth, JSSDK, Store } = require('../lib');

describe('index', function() {
  it('should get OAuth class', function() {
    OAuth.constructor.name.should.be.equal('Function');
    new OAuth(config).constructor.name.should.be.equal('OAuth');
  });

  it('should get JSSDK class', function() {
    JSSDK.constructor.name.should.be.equal('Function');
    new JSSDK(config).constructor.name.should.be.equal('JSSDK');
  });

  it('should get Store class', function() {
    Store.constructor.name.should.be.equal('Function');
    new Store(config).constructor.name.should.be.equal('Store');
  });
});
