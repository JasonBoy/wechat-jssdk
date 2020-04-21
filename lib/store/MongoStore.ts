import debugFnc from 'debug';
import isEmpty from 'lodash.isempty';
import mongoose from 'mongoose';

const debug = debugFnc('wechat-MongoStore');

const Schema = mongoose.Schema;

import Store, {
  OAuthSignaturesCollection,
  StoreCardItem,
  StoreGlobalTokenItem,
  StoreOAuthItem,
  StoreUrlSignatureItem,
  UrlSignaturesCollection,
} from './Store';
import { StoreOptions } from './StoreOptions';

const GID = 'GID';

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
  gid: {
    type: String,
    default: GID,
  },
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

export interface MongoStoreOptions extends StoreOptions {
  cache?: boolean;
  dbName?: string;
  dbHost?: string;
  dbPort?: string | number;
  dbAddress?: string;
  limit?: number;
  dbOptions?: object;
}

/**
 * Simple Store using MongoDB
 */
class MongoStore extends Store {
  dbName: string;
  dbHost: string;
  dbPort: string | number;
  dbAddress: string;
  initLimit: number;
  connection: mongoose;
  Signature: mongoose.Schema;
  GlobalToken: mongoose.Schema;
  OAuthToken: mongoose.Schema;
  CardTicket: mongoose.Schema;
  // connection: Socket;

  constructor(options: MongoStoreOptions = {}) {
    super(options);

    debug('using MongoStore...');
    /* istanbul ignore if */
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

    // console.log('this.dbAddress: ', this.dbAddress);

    //Connecting to mongodb
    this.connection = mongoose.createConnection(
      this.dbAddress,
      Object.assign(
        {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          useCreateIndex: true,
          useFindAndModify: false,
        },
        options.dbOptions,
      ),
    );

    this.connection
      .then(() => {
        // we're connected!
        debug('Mongodb connected!');
        //Models
        this.Signature = this.connection.model('Signature', SignatureSchema);
        this.GlobalToken = this.connection.model(
          'GlobalToken',
          GlobalTokenSchema,
        );
        this.OAuthToken = this.connection.model('OAuthToken', OAuthTokenSchema);
        this.CardTicket = this.connection.model('CardTicket', CardTicketSchema);
        // this.Signature.syncIndexes();
        this.initializeTokenFromDB();
      })
      .catch((err) => {
        /* istanbul ignore next */
        debug(err);
      });
  }

  /**
   * Initialize wechat token, signature, etc... from mongodb
   */
  async initializeTokenFromDB(): Promise<void> {
    try {
      const results = await Promise.all([
        this.getGlobalToken(true),
        this.getUrlSignatures(),
        this.getOAuthTokens(),
        this.getCardTicket(true),
      ]);
      /* istanbul ignore if */
      if (!isEmpty(results[0])) {
        this.store.globalToken = results[0] as StoreGlobalTokenItem;
        debug('global token initialized from DB!');
      }
      /* istanbul ignore if */
      if (!isEmpty(results[1])) {
        this.store.urls = results[1] as UrlSignaturesCollection;
        debug('signatures initialized from DB!');
      }
      /* istanbul ignore if */
      if (!isEmpty(results[2])) {
        this.store.oauth = results[2] as OAuthSignaturesCollection;
        debug('user oauth tokens initialized from DB!');
      }
      /* istanbul ignore if */
      if (!isEmpty(results[3])) {
        this.store.card = results[3] as StoreCardItem;
        debug('card_ticket initialized from DB!');
      }
      this.emit('initialized');
    } catch (reason) {
      debug(reason);
      this.emit('initialized');
    }
  }

  async getGlobalToken(force?: boolean): Promise<object> {
    /* istanbul ignore if */
    if (this.cache && !force) {
      return super.getGlobalToken();
    }
    debug('getting global token from DB...');
    const token = await this.GlobalToken.findOne();
    debug('global token received!');
    return Promise.resolve(this.toObject(token));
  }

  async getCardTicket(force?: boolean): Promise<StoreCardItem> {
    /* istanbul ignore if */
    if (this.cache && !force) {
      return super.getCardTicket();
    }
    debug('getting card_ticket from DB...');
    const cardTicket = await this.CardTicket.findOne();
    debug('card_ticket received!');
    return Promise.resolve(this.toObject(cardTicket));
  }

  async getUrlSignatures(
    limit: number = this.initLimit,
  ): Promise<UrlSignaturesCollection> {
    const signatures = await this.Signature.find({}).limit(limit);
    const temp = {};
    signatures.forEach((sig) => {
      /* istanbul ignore next */
      temp[sig.url] = this.toObject(sig);
    });
    debug(`[${signatures.length}] signatures received!`);
    return Promise.resolve(temp as UrlSignaturesCollection);
  }

  async getOAuthTokens(
    limit: number = this.initLimit,
  ): Promise<OAuthSignaturesCollection> {
    const oauthTokens = await this.OAuthToken.find({}).limit(limit);
    const temp = {};
    oauthTokens.forEach((token) => {
      /* istanbul ignore next */
      temp[token.key] = this.toObject(token);
    });
    debug(`[${oauthTokens.length}] user oauth tokens received!`);
    return Promise.resolve(temp);
  }

  async updateGlobalToken(info: StoreGlobalTokenItem): Promise<object> {
    //Update to DB
    debug('updating global token...');
    await this.GlobalToken.findOneAndUpdate({}, Object.assign({}, info), {
      new: true,
      upsert: true,
    });
    debug('global token updated!');
    //return immediately from cache
    // console.log('info: ', info);
    return super.updateGlobalToken(info);
  }

  async updateCardTicket(ticketInfo: StoreCardItem): Promise<object> {
    //Update to DB
    debug('saving or updating card_ticket...');
    try {
      await this.CardTicket.findOneAndUpdate(
        {},
        Object.assign({}, ticketInfo),
        {
          new: true,
          upsert: true,
        },
      );
      debug('card_ticket updated!');
    } catch (err) {
      /* istanbul ignore next */
      debug('update card_ticket to DB failed:');
      debug(err);
    }
    return super.updateCardTicket(ticketInfo);
  }

  async saveSignature(
    url: string,
    signatureInfo: StoreUrlSignatureItem,
  ): Promise<StoreUrlSignatureItem> {
    const newSignature = new this.Signature(signatureInfo);
    try {
      await newSignature.save();
      debug(`new signature for [${url}] saved to DB`);
    } catch (err) {
      /* istanbul ignore next */
      debug('save new signature to DB failed:');
      debug(err);
    }
    return super.saveSignature(url, signatureInfo);
  }

  async getSignature(url: string): Promise<StoreUrlSignatureItem> {
    const sig = await super.getSignature(url);
    if (!isEmpty(sig)) {
      return Promise.resolve(this.toObject(sig) as StoreUrlSignatureItem);
    }
    let sig1 = await this.Signature.findOne({ url: url });
    if (!isEmpty(sig1)) {
      debug('got signature from db');
      sig1 = this.toObject(sig1);
      this.store.urls[url] = sig1;
    }
    return Promise.resolve(sig1);
  }

  async updateSignature(
    url: string,
    newInfo: StoreUrlSignatureItem,
  ): Promise<StoreUrlSignatureItem> {
    try {
      await this.Signature.findOneAndUpdate(
        { url },
        Object.assign({}, newInfo),
        {
          upsert: true,
        },
      );
      debug('update signature to DB finished!');
    } catch (err) {
      /* istanbul ignore next */
      debug('update error:', err);
    }
    return super.updateSignature(url, newInfo);
  }

  async getOAuthAccessToken(key: string): Promise<StoreOAuthItem> {
    const token = await super.getOAuthAccessToken(key);
    if (!isEmpty(token)) {
      return Promise.resolve(token);
    }
    let token1 = await this.OAuthToken.findOne({ key: key });
    if (!isEmpty(token1)) {
      debug('got oauth token from db');
      token1 = this.toObject(token1);
      this.store.oauth[key] = token1;
    }
    return Promise.resolve(token1);
  }

  async saveOAuthAccessToken(
    key: string,
    info: StoreOAuthItem,
  ): Promise<StoreOAuthItem> {
    const newOAuthToken = new this.OAuthToken(info);
    try {
      await newOAuthToken.save();
      debug(`new oauth token saved to DB`);
    } catch (err) {
      /* istanbul ignore next */
      debug(err);
      debug('save new oauth token to DB failed, try updating...');
    }
    await this.updateOAuthAccessToken(key, info);
    return super.saveOAuthAccessToken(key, info);
  }

  async updateOAuthAccessToken(
    key: string,
    newInfo: StoreOAuthItem,
  ): Promise<StoreOAuthItem> {
    try {
      await this.OAuthToken.findOneAndUpdate(
        { key },
        Object.assign({}, newInfo),
        {
          upsert: true,
        },
      );
      debug('update oauth token to DB finished!');
    } catch (err) {
      debug('update oauth token error:', err);
      throw err;
    }
    return newInfo;
  }

  async flushGlobalToken(): Promise<void> {
    debug('flushing global token...');
    const gt = this.store.globalToken;
    // console.log('gt: ', gt);
    if (!isEmpty(gt)) {
      try {
        await this.GlobalToken.findOneAndUpdate({}, Object.assign({}, gt), {
          new: true,
          upsert: true,
        });
        debug('global token flushed!');
        return Promise.resolve();
      } catch (err) {
        debug(err);
      }
    }
    return Promise.resolve();
  }

  async flushCardTicket(): Promise<void> {
    debug('flushing card_ticket...');
    const ct = this.store.card;
    // console.log('ct: ', Object.assign({}, ct));
    if (!isEmpty(ct)) {
      await this.CardTicket.updateOne({}, Object.assign({}, ct), {
        new: true,
        upsert: true,
      });
      debug('global token flushed!');
    }
    return Promise.resolve();
  }

  async flushSignatures(): Promise<void> {
    debug('flushing url signatures...');
    const signatures = this.store.urls;
    if (isEmpty(signatures)) {
      return;
    }

    const keys = Object.keys(signatures);
    const bulk = this.Signature.collection.initializeOrderedBulkOp();
    const batchedKeys = [];
    keys.forEach((key) => {
      const sig = signatures[key];
      if (!sig.updated) return;
      const temp = Object.assign({}, sig);
      temp._id && (temp._id = undefined);
      temp.hasOwnProperty('__v') && (temp.__v = undefined);
      temp.hasOwnProperty('updated') && (temp.updated = undefined);
      batchedKeys.push(key);
      bulk.find({ url: temp.url }).updateOne(
        {
          $set: temp,
        },
        { upsert: true },
      );
    });
    return new Promise(function (resolve, reject) {
      if (batchedKeys.length <= 0) {
        return resolve();
      }
      bulk.execute(function (err) {
        if (err) {
          debug(err);
          reject(err);
          return;
        }
        debug(`[${keys.length}] signatures flushed!`);
        resolve();
      });
    });
  }

  async flushOAuthTokens(): Promise<void> {
    debug('flushing oauth tokens...');
    const oauthTokens = this.store.oauth;
    if (isEmpty(oauthTokens)) {
      return;
    }
    const keys = Object.keys(oauthTokens);
    const bulk = this.OAuthToken.collection.initializeOrderedBulkOp();
    const batchedKeys = [];
    keys.forEach((key) => {
      const token = oauthTokens[key];
      if (!token.updated) return;
      const temp = Object.assign({}, token);
      temp._id && (temp._id = undefined);
      temp.hasOwnProperty('__v') && (temp.__v = undefined);
      temp.hasOwnProperty('updated') && (temp.updated = undefined);
      batchedKeys.push(key);
      bulk.find({ key: temp.key }).updateOne(
        {
          $set: temp,
        },
        { upsert: true },
      );
    });
    return new Promise(function (resolve, reject) {
      if (batchedKeys.length <= 0) {
        return resolve();
      }
      bulk.execute(function (err) {
        if (err) {
          debug(err);
          reject(err);
          return;
        }
        debug(`[${keys.length}] oauth tokens flushed!`);
        resolve();
      });
    });
  }

  async flush(): Promise<void> {
    if (!this.cache) return;
    try {
      await Promise.all([
        this.flushGlobalToken(),
        this.flushSignatures(),
        this.flushOAuthTokens(),
        this.flushCardTicket(),
      ]);
    } catch (err) {
      debug(err);
    } finally {
      await super.flush();
    }
  }

  /* istanbul ignore next */
  destroy(): void {
    this.connection.close((err) => {
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

  toObject(doc): object {
    if (
      !doc.toObject ||
      /* istanbul ignore next */ 'function' != typeof doc.toObject
    ) {
      return doc;
    }
    return doc.toObject({
      versionKey: false,
    });
  }
}

export default MongoStore;
