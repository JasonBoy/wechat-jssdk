const debug = require('debug')('wechat-mongo');
const Promise = require('bluebird');
const mongoose = require('mongoose');

Promise.promisifyAll(mongoose);

const db = mongoose.connection;

const Store = require('./Store');

const SignatureSchema = mongoose.Schema({
  url: String,
  signatureName: String,
  jsapi_ticket: String,
  nonceStr: String,
  timestamp: String,
  signature: String,
  accessToken: String,
  createDate: Date,
  modifyDate: Date,
});
const GlobalTokenSchema = mongoose.Schema({
  count: Number,
  modifyDate: Date,
  accessToken: String,
  jsapi_ticket: String,
});

const Signature = mongoose.model('Signature', SignatureSchema);
const GlobalToken = mongoose.model('GlobalToken', GlobalTokenSchema);

/**
 * Simple Store using MongoDB
 */
class MongoStore extends Store {

  constructor (options = {}) {
    super();
    this.host = options.host || 'localhost:27017';
    this.db = options.db || 'wechat';
    this.dbAddress = `mongodb://${this.host}/${this.db}`;

    db.on('error', function(err) {
      debug(err);
    });
    db.once('open', function() {
      // we're connected!
      debug('Mongodb connected!');
    });

    //Connecting to mongodb
    mongoose.connect(this.dbAddress);

  }

  getGlobalTokenInfo () {
    return GlobalToken.findOne()
      .then(token => token);
  }

}

module.exports = MongoStore;