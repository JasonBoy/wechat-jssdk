'use strict';

const debug = require('debug')('wechat-card');
const Promise = require('bluebird');
const isEmpty = require('lodash.isempty');

const util = require('./utils');
const config = require('./config');

const Store = require('./store/Store');
const FileStore = require('./store/FileStore');

const wxConfig = config.getDefaultConfiguration();

class Card {

  /**
   * Wechat Card/Coupons class
   * @constructor
   * @param options
   * @return {Card} Card instance
   */
  constructor (options) {

    config.checkPassedConfiguration(options);

    this.wechatConfig = isEmpty(options) ? wxConfig : Object.assign({}, wxConfig, options);

    if(!options.store || !(options.store instanceof Store)) {
      debug('Store not provided, using default FileStore...');
      this.store = new FileStore();
    } else {
      this.store = options.store;
    }

  }

  /**
   * Get Card api_ticket
   * @param {string} accessToken
   * @return {Promise}
   */
  getApiTicketRemotly (accessToken) {
    const params = {
      access_token: accessToken,
      type: 'wx_card',
    };
    return util.sendWechatRequest({
        url: this.wechatConfig.ticketUrl,
        qs: params,
      })
      .then(data => {
        return this.store.updateCardTicket(data);
      })
      .catch((reason) => {
        debug('get card api_ticket failed!');
        return Promise.reject(reason);
      });
  }

  getApiTicket () {
    return this.store.getGlobalToken()
      .then((globalToken) => {
        if(!globalToken || !globalToken.accessToken || util.isExpired(globalToken.modifyDate)) {
          debug('global access token was expired, getting new global ticket now...');
          // return this.getGlobalTokenAndTicket(true);
        }
        debug('global ticket exists, use cached access token');
        return Promise.resolve(globalToken);
      })
      .then(globalToken => {

      })
    ;
  }

  /**
   * Generate card signature info for chooseCard function
   * @param {string} shopId
   * @param {string} cardType
   * @param {string} cardId
   */
  getCardSignature (shopId, cardType, cardId) {
    const infoForCardSign = {
      shopId: shopId || this.wechatConfig.shopId, //location_id
      cardType: cardType || this.wechatConfig.cardType,
      cardId: cardId || this.wechatConfig.cardId,
      timestamp: util.timestamp(),
      nonceStr: util.nonceStr(),
      // signType: 'SHA1',
      // cardSign: '',
      appid: this.wechatConfig.appId,
      api_ticket: '',
    };


  }

}

module.exports = Card;