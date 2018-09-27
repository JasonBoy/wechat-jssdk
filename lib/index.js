'use strict';

const debug = require('debug')('wechat');
const JSSDK = require('./JSSDK');
const OAuth = require('./OAuth');
const Card = require('./Card');
const Payment = require('./Payment');
const MiniProgram = require('./MiniProgram');
const Store = require('./store/Store');
const FileStore = require('./store/FileStore');
const MongoStore = require('./store/MongoStore');

class Wechat {
  /**
   * @constructor
   * @param options custom wechat configuration
   * @return {Wechat}
   */
  constructor(options) {
    options = options || {};
    //no custom store provided, using default FileStore
    if (!options.store || !(options.store instanceof Store)) {
      debug('Store not provided, using default FileStore...');
      options.store = new FileStore(options);
    }

    //create a JSSDK instance
    this.jssdk = new JSSDK(options);
    //create a OAuth instance
    this.oauth = new OAuth(options);
    /* istanbul ignore if  */
    if (options.card) {
      //create a Card instance
      this.card = new Card(options);
    }
    /* istanbul ignore if  */
    if (options.payment) {
      //create a Payment instance
      this.payment = new Payment(options);
    }
    /* istanbul ignore if  */
    if (options.miniProgram) {
      //create a MiniProgram instance
      this.miniProgram = new MiniProgram(options);
    }

    this.store = options.store;
  }

  /**
   * Export JSSDK class
   * @return {JSSDK}
   */
  /* istanbul ignore next  */
  static get JSSDK() {
    return JSSDK;
  }

  /**
   * Export OAuth class
   * @return {OAuth}
   */
  /* istanbul ignore next  */
  static get OAuth() {
    return OAuth;
  }

  /**
   * Export Card class
   * @return {Card}
   */
  /* istanbul ignore next  */
  static get Card() {
    return Card;
  }

  /**
   * Export base Store class to let user extend
   * @return {Store}
   */
  /* istanbul ignore next  */
  static get Store() {
    return Store;
  }

  /**
   * Export FileStore
   * @return {FileStore}
   */
  /* istanbul ignore next  */
  static get FileStore() {
    return FileStore;
  }

  /**
   * Export MongoStore
   * @return {MongoStore}
   */
  /* istanbul ignore next  */
  static get MongoStore() {
    return MongoStore;
  }

  /* istanbul ignore next  */
  static get Payment() {
    return Payment;
  }

  /* istanbul ignore next  */
  static get MiniProgram() {
    return MiniProgram;
  }
}

module.exports = Wechat;
