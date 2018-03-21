'use strict';

const debug = require('debug')('wechat-MongoStore');
const isEmpty = require('lodash.isempty');
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
const OAuthTokenSchema = new Schema({
  key: {
    type: String,
    index: true,
    unique: true,
  },
  access_token: String,
  expires_in: Number,
  refresh_token: String,
  openid: {
    type: String,
    index: true,
    unique: true,
  },
  scope: String,
  expirationTime: Number,
});
const CardTicketSchema = new Schema({
  ticket: String,
  expires_in: Number,
  modifyDate: Date,
});

/**
 * Simple Store using MongoDB
 */
class MongoStore extends Store {
  /**
   * Simple mongodb store
   * @param options
   * @constructor
   */
  constructor(options) {
    super(options);

    if (!options) {
      options = {};
    }

    debug('using MongoStore...');
    if (options.hasOwnProperty('cache')) {
      this.cache = !!options.cache;
    }
    this.dbName = options.dbName || 'wechat';
    this.dbHost = options.dbHost || '127.0.0.1';
    this.dbPort = options.dbPort || '27017';
    this.dbAddress =
      options.dbAddress ||
      `mongodb://${this.dbHost}:${this.dbPort}/${this.dbName}`;

    this.initLimit = options.limit || 20;

    //Connecting to mongodb
    const conn = (this.connection = mongoose.createConnection(
      this.dbAddress,
      options.dbOptions || {}
    ));

    conn.on('error', err => {
      debug(err);
    });
    conn.once('open', () => {
      // we're connected!
      debug('Mongodb connected!');
      this.initializeTokenFromDB();
    });

    //Models
    this.Signature = conn.model('Signature', SignatureSchema);
    this.GlobalToken = conn.model('GlobalToken', GlobalTokenSchema);
    this.OAuthToken = conn.model('OAuthToken', OAuthTokenSchema);
    this.CardTicket = conn.model('CardTicket', CardTicketSchema);
  }

  /**
   * Initialize wechat token, signature, etc... from mongodb
   */
  initializeTokenFromDB() {
    Promise.all([
      this.getGlobalToken(true),
      this.getUrlSignatures(),
      this.getOAuthTokens(),
      this.getCardTicket(true),
    ])
      .then(results => {
        if (!isEmpty(results[0])) {
          this.store.globalToken = results[0];
          debug('global token initialized from DB!');
        }
        if (!isEmpty(results[1])) {
          this.store.urls = results[1];
          debug('signatures initialized from DB!');
        }
        if (!isEmpty(results[2])) {
          this.store.oauth = results[2];
          debug('user oauth tokens initialized from DB!');
        }
        if (!isEmpty(results[3])) {
          this.store.card = results[3];
          debug('card_ticket initialized from DB!');
        }
        this.emit('initialized');
      })
      .catch(reason => debug(reason));
  }

  getGlobalToken() {
    if (this.cache && !arguments[0]) {
      return super.getGlobalToken();
    }
    debug('getting global token from DB...');
    return this.GlobalToken.findOne().then(token => {
      debug('global token received!');
      return Promise.resolve(token);
    });
  }

  getCardTicket() {
    if (this.cache && !arguments[0]) {
      return super.getCardTicket();
    }
    debug('getting card_ticket from DB...');
    return this.CardTicket.findOne().then(cardTicket => {
      debug('card_ticket received!');
      return Promise.resolve(cardTicket);
    });
  }

  getUrlSignatures(limit) {
    return this.Signature.find({})
      .limit(limit || this.initLimit)
      .then(signatures => {
        const temp = {};
        signatures.forEach(sig => {
          temp[sig.url] = sig;
        });
        debug(`[${signatures.length}] signatures received!`);
        return Promise.resolve(temp);
      });
  }

  getOAuthTokens(limit) {
    return this.OAuthToken.find({})
      .limit(limit || this.initLimit)
      .then(oauthTokens => {
        const temp = {};
        oauthTokens.forEach(token => {
          temp[token.key] = token;
        });
        debug(`[${oauthTokens.length}] user oauth tokens received!`);
        return Promise.resolve(temp);
      });
  }

  updateGlobalToken(info) {
    //Update to DB
    debug('updating global token...');
    this.GlobalToken.findOneAndUpdate({}, info, {
      new: true,
      upsert: true,
    }).then(() => {
      debug('global token updated!');
      // Promise.resolve(newResult);
    });
    //return immediately from cache
    return super.updateGlobalToken(info);
  }

  updateCardTicket(ticketInfo) {
    //Update to DB
    debug('saving or updating card_ticket...');
    this.CardTicket.findOneAndUpdate({}, ticketInfo, {
      new: true,
      upsert: true,
    }).then(() => {
      debug('card_ticket updated!');
      // Promise.resolve(newResult);
    });
    //return immediately from cache
    return super.updateCardTicket(ticketInfo);
  }

  saveSignature(url, signatureInfo) {
    const newSignature = new this.Signature(signatureInfo);
    newSignature
      .save()
      .then(() => {
        debug(`new signature for [${url}] saved to DB`);
      })
      .catch(err => {
        debug('save new signature to DB failed:');
        debug(err);
      });
    return super.saveSignature(url, signatureInfo);
  }

  getSignature(url) {
    return super.getSignature(url).then(sig => {
      if (!isEmpty(sig)) {
        return Promise.resolve(sig);
      }
      return this.Signature.findOne({ url: url }).then(sig => {
        if (!isEmpty(sig)) {
          debug('got signature from db');
          this.store.urls[url] = sig;
        }
        return Promise.resolve(sig);
      });
    });
  }

  updateSignature(url, newInfo) {
    this.Signature.findOneAndUpdate({ url }, newInfo, { upsert: true })
      .then(() => {
        debug('update signature to DB finished!');
      })
      .catch(err => {
        debug('update error:', err);
      });
    return super.updateSignature(url, newInfo);
  }

  getOAuthAccessToken(key) {
    return super.getOAuthAccessToken(key).then(token => {
      if (!isEmpty(token)) {
        return Promise.resolve(token);
      }
      return this.OAuthToken.findOne({ key: key }).then(token => {
        if (!isEmpty(token)) {
          debug('got oauth token from db');
          this.store.oauth[key] = token;
        }
        return Promise.resolve(token);
      });
    });
  }

  saveOAuthAccessToken(key, info) {
    const newOAuthToken = new this.OAuthToken(info);
    newOAuthToken
      .save()
      .then(() => {
        debug(`new oauth token saved to DB`);
      })
      .catch(err => {
        debug(err);
        debug('save new oauth token to DB failed, try updating...');
        this.updateOAuthAccessToken(key, info);
      });
    return super.saveOAuthAccessToken(key, info);
  }

  updateOAuthAccessToken(key, newInfo) {
    this.OAuthToken.findOneAndUpdate({ key }, newInfo, { upsert: true })
      .then(() => {
        debug('update oauth token to DB finished!');
      })
      .catch(err => {
        debug('update oauth token error:', err);
      });
    return super.updateSignature(key, newInfo);
  }

  flushGlobalToken() {
    debug('flushing global token...');
    const gt = this.store.globalToken;
    if (!isEmpty(gt)) {
      return this.GlobalToken.findOneAndUpdate({}, gt, {
        new: true,
        upsert: true,
      }).then(newResult => {
        debug('global token flushed!');
        Promise.resolve(newResult);
      });
    }
    return Promise.resolve(undefined);
  }

  flushCardTicket() {
    debug('flushing card_ticket...');
    const ct = this.store.card;
    if (!isEmpty(ct)) {
      return this.CardTicket.findOneAndUpdate({}, ct, {
        new: true,
        upsert: true,
      }).then(() => {
        debug('global token flushed!');
        // Promise.resolve(newResult);
      });
    }
    return Promise.resolve(undefined);
  }

  flushSignatures() {
    debug('flushing url signatures...');
    const signatures = this.store.urls;
    if (!isEmpty(signatures)) {
      const keys = Object.keys(signatures);
      const bulk = this.Signature.collection.initializeOrderedBulkOp();
      const batchedKeys = [];
      keys.forEach(key => {
        const sig = signatures[key];
        if (!sig.updated) return;
        const temp = Object.assign({}, sig);
        delete temp._id;
        delete temp.__v;
        delete temp.updated;
        batchedKeys.push(key);
        bulk.find({ url: temp.url }).updateOne(
          {
            $set: temp,
          },
          { upsert: true }
        );
      });
      return new Promise(function(resolve, reject) {
        try {
          if (batchedKeys.length <= 0) {
            return resolve(true);
          }
          bulk.execute(function(err) {
            if (err) {
              debug(err);
            } else {
              debug(`[${keys.length}] signatures flushed!`);
            }
            resolve(true);
          });
        } catch (e) {
          debug(e);
          reject(e);
        }
      });
    }
    return Promise.resolve(undefined);
  }

  flushOAuthTokens() {
    debug('flushing oauth tokens...');
    const oauthTokens = this.store.oauth;
    if (!isEmpty(oauthTokens)) {
      const keys = Object.keys(oauthTokens);
      const bulk = this.OAuthToken.collection.initializeOrderedBulkOp();
      const batchedKeys = [];
      keys.forEach(key => {
        const token = oauthTokens[key];
        if (!token.updated) return;
        const temp = Object.assign({}, token);
        delete temp._id;
        delete temp.__v;
        delete temp.updated;
        batchedKeys.push(key);
        bulk.find({ key: temp.key }).updateOne(
          {
            $set: temp,
          },
          { upsert: true }
        );
      });
      return new Promise(function(resolve, reject) {
        try {
          if (batchedKeys.length <= 0) {
            return resolve(true);
          }
          bulk.execute(function(err) {
            if (err) {
              debug(err);
            } else {
              debug(`[${keys.length}] oauth tokens flushed!`);
            }
            resolve(true);
          });
        } catch (e) {
          debug(e);
          reject(e);
        }
      });
    }
    return Promise.resolve(undefined);
  }

  flush() {
    if (!this.cache) return Promise.resolve(true);

    return Promise.all([
      this.flushGlobalToken(),
      this.flushSignatures(),
      this.flushOAuthTokens(),
      this.flushCardTicket(),
    ])
      .then(() => super.flush())
      .catch(() => super.flush());
  }

  destroy() {
    this.connection.close(err => {
      if (err) {
        debug(err);
      }
    });
    this.Signature = null;
    this.GlobalToken = null;
    this.OAuthToken = null;
    this.CardTicket = null;
    super.destroy();
    debug('mongoStore destroyed!');
  }
}

module.exports = MongoStore;
