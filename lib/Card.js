'use strict';

const debug = require('debug')('wechat-Card');
const Promise = require('bluebird');
const isEmpty = require('lodash.isempty');

const utils = require('./utils');
const config = require('./config');

const Store = require('./store/Store');
const FileStore = require('./store/FileStore');
const codeUtils = require('./code');

const wxConfig = config.getDefaultConfiguration();

const CODE_TYPE = {
  CODE_TYPE_QRCODE: 'CODE_TYPE_QRCODE',
  CODE_TYPE_BARCODE: 'CODE_TYPE_BARCODE',
  CODE_TYPE_ONLY_QRCODE: 'CODE_TYPE_ONLY_QRCODE',
  CODE_TYPE_TEXT: 'CODE_TYPE_TEXT',
  CODE_TYPE_NONE: 'CODE_TYPE_NONE',
};

const CARD_TYPE = {
  GROUPON: 'GROUPON',
  CASH: 'CASH',
  DISCOUNT: 'DISCOUNT',
  GIFT: 'GIFT',
  GENERAL_COUPON: 'GENERAL_COUPON',
};

const TOKEN_TYPE = 'wx_card';

class Card {
  /**
   * Wechat Card/Coupons class
   * @constructor
   * @param options
   * @return {Card} Card instance
   */
  constructor(options) {
    config.checkPassedConfiguration(options);

    this.wechatConfig = isEmpty(options)
      ? wxConfig
      : Object.assign({}, wxConfig, options);

    if (!options.store || !(options.store instanceof Store)) {
      debug('Store not provided, using default FileStore...');
      this.store = new FileStore(options);
    } else {
      this.store = options.store;
    }
  }

  static get CODE_TYPE() {
    return CODE_TYPE;
  }

  static get CARD_TYPE() {
    return CARD_TYPE;
  }

  /**
   * Get Card api_ticket
   * @param {string} accessToken
   * @return {Promise}
   */
  getApiTicketRemotely(accessToken) {
    const params = {
      access_token: accessToken,
      type: TOKEN_TYPE,
    };
    return utils
      .sendWechatRequest({
        url: this.wechatConfig.ticketUrl,
        qs: params,
      })
      .then(data => {
        data = Object.assign({ modifyDate: new Date() }, data);
        data.errcode = undefined;
        data.errmsg = undefined;
        return this.store.updateCardTicket(data);
      })
      .catch(reason => {
        debug('get card api_ticket failed!');
        return Promise.reject(reason);
      });
  }

  /**
   * Get global access token
   * @param {Boolean} force if should check for cached token
   * @return {Promise}
   */
  getGlobalToken(force) {
    const cfg = this.wechatConfig;
    if (force) {
      return utils
        .getGlobalAccessToken(cfg.appId, cfg.appSecret, cfg.accessTokenUrl)
        .then(globalToken => {
          const info = {
            modifyDate: new Date(),
            accessToken: globalToken.access_token,
          };
          return this.store.updateGlobalToken(info);
        });
    }

    return this.store.getGlobalToken().then(globalToken => {
      if (
        !globalToken ||
        !globalToken.accessToken ||
        utils.isExpired(globalToken.modifyDate)
      ) {
        debug(
          'global access token was expired, getting new global access token now...'
        );
        return utils
          .getGlobalAccessToken(cfg.appId, cfg.appSecret, cfg.accessTokenUrl)
          .then(globalToken => {
            const info = {
              modifyDate: new Date(),
              accessToken: globalToken.access_token,
            };
            return this.store.updateGlobalToken(info);
          });
        // .then(info => Promise.reject(info));
      }
      return Promise.resolve(globalToken);
    });
  }

  /**
   * Get card api_ticket
   * @return {Promise}
   */
  getApiTicket() {
    return this.store
      .getCardTicket()
      .then(ticketInfo => {
        if (
          ticketInfo &&
          ticketInfo.ticket &&
          !utils.isExpired(ticketInfo.modifyDate)
        ) {
          return Promise.resolve(ticketInfo);
        }
        return this.getGlobalToken().then(info => Promise.reject(info));
      })
      .catch(globalToken => {
        // console.log(globalToken);
        return this.getApiTicketRemotely(globalToken.accessToken);
      });
  }

  /**
   * Generate card signature info for chooseCard function
   * @param {string=} shopId, aka: location_id
   * @param {string=} cardType
   * @param {string=} cardId
   * @return {Promise}
   */
  getCardSignature(shopId, cardType, cardId) {
    const infoForCardSign = {
      shopId: shopId || '', //location_id
      cardType: cardType || '',
      cardId: cardId || '',
      timestamp: utils.timestamp(),
      nonceStr: utils.nonceStr(),
      appid: this.wechatConfig.appId,
      api_ticket: '',
    };
    return this.getApiTicket()
      .then(ticketInfo => {
        infoForCardSign.api_ticket = ticketInfo.ticket;
        const keys = Object.keys(infoForCardSign);
        const values = keys.map(key => infoForCardSign[key]);
        values.sort();
        infoForCardSign.cardSign = utils.genSHA1(values.join(''));
        infoForCardSign.appid = undefined;
        infoForCardSign.api_ticket = undefined;
        infoForCardSign.signType = 'SHA1';
        return Promise.resolve(infoForCardSign);
      })
      .catch(reason => {
        return Promise.reject(reason);
      });
  }

  /**
   * Generate cardExt
   * @param {string} cardId
   * @param {string=} code
   * @param {string=} openid
   * @param {string=} fixed_begintimestamp
   * @param {string=} outer_str
   * @return {Promise}
   */
  getCardExt(cardId, code, openid, fixed_begintimestamp, outer_str) {
    const infoForCardExt = {
      // card_id: cardId || '',
      // code: code || '',
      // openid: openid || '',
      timestamp: utils.timestamp(),
      nonce_str: utils.nonceStr(),
      // fixed_begintimestamp: fixed_begintimestamp || '',
      // outer_str: outer_str || '',
      // signature: '',
    };
    if (cardId) {
      infoForCardExt.card_id = cardId;
    }
    if (code) {
      infoForCardExt.code = code;
    }
    if (openid) {
      infoForCardExt.openid = openid;
    }
    return this.getApiTicket()
      .then(ticketInfo => {
        infoForCardExt.api_ticket = ticketInfo.ticket;
        const keys = Object.keys(infoForCardExt);
        const values = keys.map(key => infoForCardExt[key]);
        infoForCardExt.signature = utils.genSHA1(values.sort().join(''));
        fixed_begintimestamp &&
          (infoForCardExt.fixed_begintimestamp = fixed_begintimestamp);
        outer_str && (infoForCardExt.outer_str = outer_str);
        infoForCardExt.api_ticket = undefined;
        return Promise.resolve(JSON.stringify(infoForCardExt));
      })
      .catch(reason => {
        return Promise.reject(reason);
      });
  }

  /**
   * Simply send decode card encrypt_code api
   * @param {String} encryptCode encrypt_code of real card code
   * @param {object} qs querystring object to send with the request
   * @return {Promise}
   */
  sendDecodeRequest(encryptCode, qs) {
    return utils.sendWechatRequest({
      url: this.wechatConfig.decodeCardCodeUrl,
      qs: qs,
      method: 'POST',
      json: true,
      body: {
        encrypt_code: encryptCode,
      },
    });
  }

  /**
   * Decode/Decrypt card encrypt_code to get real card code
   * @param {string} encryptCode
   * @return {Promise}
   */
  decryptCardCode(encryptCode) {
    return this.getGlobalToken().then(info => {
      const accessToken = info.accessToken;
      const params = {
        access_token: accessToken,
      };
      return this.sendDecodeRequest(encryptCode, params).catch(reason => {
        debug('decode card encrypt_code failed!');
        //retry when access token error
        if (codeUtils.errorByAccessTokenRelated(reason.errcode)) {
          return this.getGlobalToken(true).then(info => {
            const accessToken = info.accessToken;
            const params = {
              access_token: accessToken,
            };
            return this.sendDecodeRequest(encryptCode, params).catch(reason => {
              debug(
                'decode card encrypt_code failed again, tray again later!!!'
              );
              return Promise.reject(reason);
            });
          });
        }
        return Promise.reject(reason);
      });
    });
  }
}

module.exports = Card;
