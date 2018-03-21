'use strict';

const bootstrap = require('./bootstrap');
const config = bootstrap.config;
const should = bootstrap.should;

const configCheck = require('../lib/config').checkPassedConfiguration;

describe('config', function() {
  it('should throw error with empty options', function() {
    (function() {
      configCheck({});
    }.should.throw(/wechat configuration/));
  });

  it('should throw error with empty wechat appid', function() {
    const temp = Object.assign({}, config);
    delete temp.appId;
    (function() {
      configCheck(temp);
    }.should.throw(/wechat appId/));
  });

  it('should throw error with empty wechat appSecret', function() {
    const temp = Object.assign({}, config);
    delete temp.appSecret;
    (function() {
      configCheck(temp);
    }.should.throw(/wechat appSecret/));
  });
});
