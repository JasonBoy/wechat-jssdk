'use strict';

const debug = require('debug')('wechat');
const { COMPARE_CONFIG_KEYS } = require('./config');
const JSSDK = require('./JSSDK');
const OAuth = require('./OAuth');
const Card = require('./Card');
const Payment = require('./Payment');
const MiniProgram = require('./MiniProgram');
const Store = require('./store/Store');
const FileStore = require('./store/FileStore');

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
      options.store = new FileStore(options.storeOptions, options);
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
}

module.exports = Wechat;
