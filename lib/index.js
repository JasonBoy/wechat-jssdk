'use strict';

const debug = require('debug')('wechat');
const JSSDK = require('./JSSDK');
const OAuth = require('./OAuth');
const Card = require('./Card');
const Store = require('./store/Store');
const FileStore = require('./store/FileStore');
const MongoStore = require('./store/MongoStore');

class Wechat {
  /**
   * @constructor
   * @param options custom wechat configuration
   * @return {Wechat}
   */
  constructor (options) {
    options = options || {};
    //no custom store provided, using default FileStore
    if(!options.store || !(options.store instanceof Store)) {
      debug('Store not provided, using default FileStore...');
      options.store = new FileStore(options);
    }

    this.jssdk = new JSSDK(options); //create a JSSDK instance
    this.oauth = new OAuth(options); //create a OAuth instance
    this.card = new Card(options); //create a Card instance

    this.store = options.store;
  }

  /**
   * Export JSSDK class
   * @return {JSSDK}
   */
  static get JSSDK () {
    return JSSDK;
  }

  /**
   * Export OAuth class
   * @return {OAuth}
   */
  static get OAuth () {
    return OAuth;
  }

  /**
   * Export Card class
   * @return {Card}
   */
  static get Card () {
    return Card;
  }

  /**
   * Export base Store class to let user extend
   * @return {Store}
   */
  static get Store () {
    return Store;
  }

  /**
   * Export FileStore
   * @return {FileStore}
   */
  static get FileStore () {
    return FileStore;
  }

  /**
   * Export MongoStore
   * @return {MongoStore}
   */
  static get MongoStore () {
    return MongoStore;
  }
}

module.exports = Wechat;
