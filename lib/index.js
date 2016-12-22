'use strict';

const JSSDK = require('./JSSDK');
const OAuth = require('./OAuth');
const Store = require('./store/Store');
const FileStore = require('./store/FileStore');
const MongoStore = require('./store/MongoStore');

class Wechat {
  /**
   * @constructor
   * @param config custom wechat configuration
   * @return {Wechat}
   */
  constructor (config) {
    this.jssdk = new JSSDK(config); //create a JSSDK instance
    this.oauth = new OAuth(config); //create a OAuth instance
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
