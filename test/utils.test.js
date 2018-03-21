const fs = require('fs');
const path = require('path');

const utils = require('../lib/utils');
const bootstrap = require('./bootstrap');

const should = bootstrap.should;

describe('Utils', function() {
  describe('#genMD5()', function() {
    it('should get hash from the content', function() {
      const hash = utils.genMD5('md5_test');
      hash.should.equal('c74318b61a3024520c466f828c043c79');
    });
  });
  describe('#genSHA1()', function() {
    it('should get hash from the content', function() {
      const hash = utils.genSHA1('sha1_test');
      hash.should.equal('18cb41714af7239d6a6b28dc1df74603eebc4da8');
    });
  });
  describe('#simpleDate()', function() {
    it('should return the date with default format', function() {
      const date = new Date(2017, 0, 1, 10, 10, 8);
      const result = utils.simpleDate(date);
      result.should.equal('20170101101008');
    });
    it('should return the current date with default format', function() {
      const result = utils.simpleDate();
      result.length.should.equal(14);
    });
  });
});
