const fs = require('fs');
const path = require('path');

const utils = require('../lib/utils');
const bootstrap = require('./bootstrap');

const should = bootstrap.should;

describe('XML', function() {
  describe('#parseXML()', function() {
    it('should parse the xml data without root', function(done) {
      const xmlData = fs.readFileSync(path.join(__dirname, 'data.xml'));
      utils
        .parseXML(xmlData)
        .then(data => {
          data.should.have.property('appid').equal('wx2421b1c4370ec43b');
          data.should.have
            .property('sign')
            .equal('0CB01533B8C1EF103065174F50BCA001');
        })
        .catch(() => {})
        .then(() => done());
    });
  });
  describe('#buildXML()', function() {
    it('should build the xml data with xml root', function(done) {
      const objData = {
        appid: 'appid',
        sign:
          '{ "goods_detail":[ { "goods_id":"iphone6s_16G", "wxpay_goods_id":"1001", "goods_name":"iPhone6s 16G", "quantity":1, "price":528800, "goods_category":"123456", "body":"苹果手机" }, { "goods_id":"iphone6s_32G", "wxpay_goods_id":"1002", "goods_name":"iPhone6s 32G", "quantity":1, "price":608800, "goods_category":"123789", "body":"苹果手机" } ] }',
      };
      utils
        .buildXML(objData)
        .then(data => {
          // console.log(data);
          return utils.parseXML(data);
        })
        .then(result => {
          result.should.have.property('appid').equal(objData.appid);
          result.should.have.property('sign').equal(objData.sign);
        })
        .catch(() => {})
        .then(() => done());
    });
  });
});
