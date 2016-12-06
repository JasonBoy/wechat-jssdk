const debug = require('debug')('wechat-mongo');
const debugError = require('debug')('wechat-mongo-err');
const _ = require('lodash');
const Promise = require('bluebird');
const mongoose = require('mongoose');

mongoose.Promise = Promise;

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

    debug('using MongoStore...');
    if(options.hasOwnProperty('cache')) {
      this.cache = !!options.cache;
    }
    this.dbName = options.dbName || 'wechat';
    this.dbAddress = options.dbAddress || `mongodb://127.0.0.1:27017/${this.dbName}`;

    db.on('error', (err) => {
      debugError(err);
    });
    db.once('open', () => {
      // we're connected!
      debug('Mongodb connected!');
      this.initializeTokenFromDB();
    });

    //Connecting to mongodb
    mongoose.connect(this.dbAddress, options.dbOptions || {});

  }

  initializeTokenFromDB () {
    return Promise.all([
        this.getGlobalTokenInfo(true),
        this.getUrlSignatures(),
      ]).then((results) => {
        if(!_.isEmpty(results[0])) {
          this.store.globalToken = results[0];
          debug('global token initialized from DB!')
        }
        if(!_.isEmpty(results[1])) {
          this.store.urls = results[1];
          debug('signatures initialized from DB!')
        }
      });
  }

  getGlobalTokenInfo () {
    if(this.cache && !arguments[0]) {
      return super.getGlobalTokenInfo();
    }
    debug('getting global token from DB...');
    return GlobalToken.findOne()
      .then(token => {
        debug('global token received!');
        return Promise.resolve(token);
      });
  }

  getUrlSignatures () {
    return Signature.find({})
      .then((signatures) => {
        const temp = {};
        signatures.forEach((sig) => {
          temp[sig.url] = sig;
        });
        debug('signatures received!');
        return Promise.resolve(temp);
      });
  }

  updateGlobalTokenInfo (info) {
    //Update to DB
    debug('updating global token...');
    GlobalToken.findOneAndUpdate({}, info, {new: true, upsert: true})
      .then((newResult) => {
        debug('global token updated!');
        Promise.resolve(newResult);
      });
    //return immediately from cache
    return super.updateGlobalTokenInfo(info);
  }

  setNewSignature (url, signatureInfo) {
    const newSignature = new Signature(signatureInfo);
    newSignature.save()
      .then(() => {
        debug(`new signature for [${url}] saved to DB`);
      })
      .catch((err) => {
        debugError('save new signature to DB failed:');
        debugError(err);
      });
    return super.setNewSignature(url, signatureInfo);
  }

  updateSignature (url, newInfo) {
    Signature.findOneAndUpdate({url}, newInfo, {upsert: true})
      .then(() => {
        debug('update signature to DB finished!');
      })
      .catch((err) => {
        debugError('update error:', err);
      });
    return super.updateSignature(url, newInfo);
  }

  isSignatureExisted (url) {
    // Signature.where({url}).count()
    //   .then((count) => {
    //     debug('count: %d', count);
    //   })
    //   .catch((err) => {
    //     err('count failed!', err);
    //   });
    return super.isSignatureExisted(url);
  }

  flushGlobalToken () {
    const gt = this.store.globalToken;
    if(!_.isEmpty(gt)) {
      return GlobalToken.findOneAndUpdate({}, gt, {new: true, upsert: true})
        .then((newResult) => {
          debug('global token flushed!');
          Promise.resolve(newResult);
        });
    }
    return Promise.resolve(undefined);
  }

  flushSignatures () {
    const signatures = this.store.urls;
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
      return new Promise(function(resolve) {
        bulk.execute(function (err) {
          if(err) {
            err(err);
          } else {
            debug('signatures flushed!');
          }
          resolve(true);
        });
      });
    }
    return Promise.resolve(undefined);
  }

  flushStore () {
    if(!this.cache) return Promise.resolve(true);

    return Promise.all([
      this.flushGlobalToken(),
      this.flushSignatures(),
    ]).then(() => super.flushStore());
  }

}

module.exports = MongoStore;