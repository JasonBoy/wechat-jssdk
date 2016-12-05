const debug = require('debug')('wechat-mongo');
const _ = require('lodash');
const mongoose = require('mongoose');

mongoose.Promise = require('bluebird');

const db = mongoose.connection;

const Store = require('./Store');

const SignatureSchema = mongoose.Schema({
  url: {
    type: String,
    index: true,
    unique: true,
  },
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
  accessToken: {
    type: String,
    index: true,
    unique: true,
  },
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

    this.dbName = options.dbName || 'wechat';
    this.dbAddress = options.dbAddress || `mongodb://127.0.0.1:27017/${this.dbName}`;

    db.on('error', function(err) {
      debug(err);
    });
    db.once('open', function() {
      // we're connected!
      debug('Mongodb connected!');
    });

    //Connecting to mongodb
    mongoose.connect(this.dbAddress, options.dbOptions || {});

  }

  getGlobalTokenInfo () {
    return GlobalToken.findOne()
      .then(token => {
        debug('getting token:');
        debug(token);
      });
  }

  updateGlobalTokenInfo (info) {
    return GlobalToken.findOneAndUpdate({}, info, {new: true, upsert: true})
      .then((newResult) => {
        debug('updated global token:');
        debug(newResult);
      });
  }

  setNewSignature (url, signatureInfo) {
    const newSignature = new Signature(signatureInfo);
    return newSignature.save()
      .then((result) => {
        debug('saved: ', result);
      })
      .catch((err) => {
        debug(err);
      });
  }

  updateSignature (url, newInfo) {
    return Signature.findOneAndUpdate({url}, newInfo, {upsert: true})
      .then((oldResult) => {
        debug('old result: ', oldResult);
      })
      .catch((err) => {
        debug('update error:', err);
      });
  }

  isSignatureExisted (url) {
    return Signature.where({url}).count()
      .then((count) => {
        debug('count: %d', count);
      })
      .catch((err) => {
        debug('count failed!', err);
      })
  }

  flushStore () {
    // if(!this.cache) return;
    const store = this.store;
    const globalToken = store.globalToken;
    if(globalToken.accessToken) {
      this.updateGlobalTokenInfo(globalToken);
    }
    const signatures = store.urls;
    if(!_.isEmpty(signatures)) {
      const keys = Object.keys(signatures);
      const bulk = Signature.collection.initializeOrderedBulkOp();
      keys.forEach((key) => {
        const temp = Object.assign({}, signatures[key]);
        delete temp._id;
        delete temp.__v;
        bulk.find({url: temp.url}).updateOne({
          $set: temp
        })
      });
      bulk.execute(function (err, result) {
        debug('bulk result: ', result.ok);
      });
    }
  }

}

module.exports = MongoStore;
