const debug = require('debug')('wechat-mongo');
const debugError = require('debug')('wechat-mongo-err');
const _ = require('lodash');
const Promise = require('bluebird');
const mongoose = require('mongoose');

mongoose.Promise = Promise;

const Schema = mongoose.Schema;

const Store = require('./Store');

const SignatureSchema = new Schema({
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
const GlobalTokenSchema = new Schema({
  count: Number,
  modifyDate: Date,
  accessToken: {
    type: String,
    index: true,
    unique: true,
  },
  jsapi_ticket: String,
});

/**
 * Simple Store using MongoDB
 */
class MongoStore extends Store {

  constructor (options = {}) {
    super(options);

    debug('using MongoStore...');
    if(options.hasOwnProperty('cache')) {
      this.cache = !!options.cache;
    }
    this.dbName = options.dbName || 'wechat';
    this.dbHost = options.dbHost || '127.0.0.1';
    this.dbPort = options.dbPort || '27017';
    this.dbAddress = options.dbAddress
      || `mongodb://${this.dbHost}:${this.dbPort}/${this.dbName}`;

    this.initLimit = options.limit || 20;

    //Connecting to mongodb
    const conn = this.connection = mongoose.createConnection(this.dbAddress, options.dbOptions || {});

    conn.on('error', (err) => {
      debugError(err);
    });
    conn.once('open', () => {
      // we're connected!
      debug('Mongodb connected!');
      this.initializeTokenFromDB();
    });

    //Models
    this.Signature = conn.model('Signature', SignatureSchema);
    this.GlobalToken = conn.model('GlobalToken', GlobalTokenSchema);

  }

  initializeTokenFromDB () {
    return Promise.all([
      this.getGlobalToken(true),
      this.getUrlSignatures(),
    ]).then((results) => {
      if (!_.isEmpty(results[0])) {
        this.store.globalToken = results[0];
        debug('global token initialized from DB!')
      }
      if (!_.isEmpty(results[1])) {
        this.store.urls = results[1];
        debug('signatures initialized from DB!')
      }
      this.emit('initialized');
    });
  }

  getGlobalToken () {
    if(this.cache && !arguments[0]) {
      return super.getGlobalToken();
    }
    debug('getting global token from DB...');
    return this.GlobalToken.findOne()
      .then(token => {
        debug('global token received!');
        return Promise.resolve(token);
      });
  }

  getUrlSignatures (limit) {
    return this.Signature.find({})
      .limit(limit || this.initLimit)
      .then((signatures) => {
        const temp = {};
        signatures.forEach((sig) => {
          temp[sig.url] = sig;
        });
        debug(`[${signatures.length}] signatures received!`);
        return Promise.resolve(temp);
      });
  }

  updateGlobalToken (info) {
    //Update to DB
    debug('updating global token...');
    this.GlobalToken.findOneAndUpdate({}, info, {new: true, upsert: true})
      .then((newResult) => {
        debug('global token updated!');
        Promise.resolve(newResult);
      });
    //return immediately from cache
    return super.updateGlobalToken(info);
  }

  saveSignature (url, signatureInfo) {
    const newSignature = new this.Signature(signatureInfo);
    newSignature.save()
      .then(() => {
        debug(`new signature for [${url}] saved to DB`);
      })
      .catch((err) => {
        debugError('save new signature to DB failed:');
        debugError(err);
      });
    return super.saveSignature(url, signatureInfo);
  }

  getSignature (url) {
    return super.getSignature(url)
      .then((sig) => {
        if(!_.isEmpty(sig)) {
          return Promise.resolve(sig);
        }
        return this.Signature.findOne({url: url})
          .then((sig) => {
            if(!_.isEmpty(sig)) {
              debug('got signature from db');
              this.store.urls[url] = sig;
            }
            return Promise.resolve(sig);
          });
      });
  }

  updateSignature (url, newInfo) {
    this.Signature.findOneAndUpdate({url}, newInfo, {upsert: true})
      .then(() => {
        debug('update signature to DB finished!');
      })
      .catch((err) => {
        debugError('update error:', err);
      });
    return super.updateSignature(url, newInfo);
  }

  // isSignatureExisted (url) {
  //   return super.isSignatureExisted(url);
  // }

  flushGlobalToken () {
    const gt = this.store.globalToken;
    if(!_.isEmpty(gt)) {
      return this.GlobalToken.findOneAndUpdate({}, gt, {new: true, upsert: true})
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
      const bulk = this.Signature.collection.initializeOrderedBulkOp();
      keys.forEach((key) => {
        const sig = signatures[key];
        if(!sig.updated) return;
        const temp = Object.assign({}, sig);
        delete temp._id;
        delete temp.__v;
        delete temp.updated;
        bulk.find({url: temp.url}).updateOne({
          $set: temp
        }, {upsert: true})
      });
      return new Promise(function(resolve, reject) {
        try {
          bulk.execute(function (err) {
            if(err) {
              debugError(err);
            } else {
              debug(`[${keys.length}] signatures flushed!`);
            }
            resolve(true);
          });
        } catch(e) {
          debugError(e);
          reject(e);
        }
      });
    }
    return Promise.resolve(undefined);
  }

  flush () {
    if(!this.cache) return Promise.resolve(true);

    return Promise.all([
        this.flushGlobalToken(),
        this.flushSignatures(),
      ])
      .then(() => super.flush())
      .catch(() => super.flush())
      ;
  }

  destroy () {
    this.connection.close((err) => {
      if(err) {
        debugError(err);
      }
    });
    this.Signature = null;
    this.GlobalToken = null;
    super.destroy();
    debug('mongoStore destroyed!');
  }

}

module.exports = MongoStore;