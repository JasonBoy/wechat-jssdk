import debugFnc from 'debug';
import isEmpty from 'lodash.isempty';
import * as utils from './utils';
import { getDefaultConfiguration, checkPassedConfiguration } from './config';

import Store, { StoreCardItem, StoreGlobalTokenItem } from './store/Store';
import FileStore from './store/FileStore';
import { errorByAccessTokenRelated } from './code';
import { WeChatOptions } from './WeChatOptions';

const debug = debugFnc('wechat-Card');

const wxConfig = getDefaultConfiguration();

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

export interface CardSignObject {
  shopId: string;
  cardType: string;
  cardId: string;
  timestamp: string;
  nonceStr: string;
  appid: string;
  api_ticket: string;
  cardSign?: string;
  signType?: string;
}
export interface CardExtObject {
  timestamp: string;
  nonce_str: string;
  card_id?: string;
  code?: string;
  openid?: string;
  api_ticket?: string;
  signature?: string;
  fixed_begintimestamp?: string;
  outer_str?: string;
}

/**
 * Wechat Card/Coupons class
 * @return {Card} Card instance
 */
class Card {
  options: WeChatOptions;
  store: Store;

  constructor(options?: WeChatOptions) {
    checkPassedConfiguration(options);

    this.options = isEmpty(options)
      ? /* istanbul ignore next  */ { ...wxConfig }
      : { ...wxConfig, ...options };

    /* istanbul ignore if  */
    if (!options.store || !(options.store instanceof Store)) {
      debug('[Card]Store not provided, using default FileStore...');
      this.store = new FileStore(options.storeOptions);
    } else {
      this.store = options.store;
    }
  }

  /* istanbul ignore next */
  static get CODE_TYPE(): object {
    return CODE_TYPE;
  }

  /* istanbul ignore next */
  static get CARD_TYPE(): object {
    return CARD_TYPE;
  }

  /**
   * Get Card api_ticket
   * @param {string} accessToken
   * @return {Promise}
   */
  async getApiTicketRemotely(accessToken): Promise<StoreCardItem> {
    const params = {
      access_token: accessToken,
      type: TOKEN_TYPE,
    };
    try {
      let data: {
        errcode?: number;
        errmsg?: string;
      } = await utils.sendWechatRequest(this.options.ticketUrl, {
        searchParams: params,
      });
      data = Object.assign({ modifyDate: new Date() }, data);
      delete data.errcode;
      delete data.errmsg;
      return await this.store.updateCardTicket(data);
    } catch (reason) {
      /* istanbul ignore next */
      debug('get card api_ticket failed!');
      return Promise.reject(reason);
    }
  }

  /**
   * Get global access token
   * @param {Boolean} force if should check for cached token
   */
  async getGlobalToken(force?: boolean): Promise<StoreGlobalTokenItem> {
    const cfg = this.options;
    /* istanbul ignore if */
    if (force) {
      const globalToken = await utils.getGlobalAccessToken(
        cfg.appId,
        cfg.appSecret,
        cfg.accessTokenUrl,
      );
      const info = {
        modifyDate: new Date(),
        accessToken: globalToken.access_token,
      };
      return this.store.updateGlobalToken(info);
    }

    const globalToken1 = await this.store.getGlobalToken();
    if (
      !globalToken1 ||
      !globalToken1.accessToken ||
      utils.isExpired(globalToken1.modifyDate)
    ) {
      debug(
        'global access token was expired, getting new global access token now...',
      );
      const globalToken2 = await utils.getGlobalAccessToken(
        cfg.appId,
        cfg.appSecret,
        cfg.accessTokenUrl,
      );
      const info = {
        modifyDate: new Date(),
        accessToken: globalToken2.access_token,
      };
      return this.store.updateGlobalToken(info);
    }
    return Promise.resolve(globalToken1);
  }

  /**
   * Get card api_ticket
   * @return {Promise}
   */
  async getApiTicket(): Promise<StoreCardItem> {
    try {
      const ticketInfo = await this.store.getCardTicket();
      if (
        ticketInfo &&
        ticketInfo.ticket &&
        !utils.isExpired(ticketInfo.modifyDate)
      ) {
        return Promise.resolve(ticketInfo);
      }
      const info = await this.getGlobalToken();
      return this.getApiTicketRemotely(info.accessToken);
    } catch (err) {
      debug(err);
      throw err;
    }
  }

  /**
   * Generate card signature info for chooseCard function
   * @param {string=} shopId, aka: location_id
   * @param {string=} cardType
   * @param {string=} cardId
   * @return {Promise}
   */
  async getCardSignature(shopId, cardType, cardId): Promise<object> {
    const infoForCardSign: CardSignObject = {
      shopId: shopId || /* istanbul ignore next */ '', //location_id
      cardType: cardType || /* istanbul ignore next */ '',
      cardId: cardId || /* istanbul ignore next */ '',
      timestamp: utils.timestamp(),
      nonceStr: utils.nonceStr(),
      appid: this.options.appId,
      api_ticket: '',
    };
    try {
      const ticketInfo = await this.getApiTicket();
      infoForCardSign.api_ticket = ticketInfo.ticket;
      const keys = Object.keys(infoForCardSign);
      const values = keys.map((key) => infoForCardSign[key]);
      values.sort();
      infoForCardSign.cardSign = utils.genSHA1(values.join(''));
      infoForCardSign.appid = undefined;
      infoForCardSign.api_ticket = undefined;
      infoForCardSign.signType = 'SHA1';
      return Promise.resolve(infoForCardSign);
    } catch (reason) {
      /* istanbul ignore next */
      return Promise.reject(reason);
    }
  }

  /**
   * Generate cardExt
   * @param {string} cardId
   * @param {string=} code
   * @param {string=} openid
   * @param {string=} fixedBeginTimestamp
   * @param {string=} outerStr
   */
  async getCardExt(
    cardId,
    code,
    openid,
    fixedBeginTimestamp,
    outerStr,
  ): Promise<string> {
    const infoForCardExt: CardExtObject = {
      // card_id: cardId || '',
      // code: code || '',
      // openid: openid || '',
      timestamp: utils.timestamp(),
      nonce_str: utils.nonceStr(),
      // fixedBeginTimestamp: fixedBeginTimestamp || '',
      // outerStr: outerStr || '',
      // signature: '',
    };
    /* istanbul ignore else */
    if (cardId) {
      infoForCardExt.card_id = cardId;
    }
    /* istanbul ignore else */
    if (code) {
      infoForCardExt.code = code;
    }
    /* istanbul ignore else */
    if (openid) {
      infoForCardExt.openid = openid;
    }
    try {
      const ticketInfo = await this.getApiTicket();
      infoForCardExt.api_ticket = ticketInfo.ticket;
      const keys = Object.keys(infoForCardExt);
      const values = keys.map((key) => infoForCardExt[key]);
      infoForCardExt.signature = utils.genSHA1(values.sort().join(''));
      if (fixedBeginTimestamp) {
        infoForCardExt.fixed_begintimestamp = fixedBeginTimestamp;
      }
      if (outerStr) {
        infoForCardExt.outer_str = outerStr;
      }
      infoForCardExt.api_ticket = undefined;
      return Promise.resolve(JSON.stringify(infoForCardExt));
    } catch (reason) {
      /* istanbul ignore next */
      return Promise.reject(reason);
    }
  }

  /**
   * Simply send decode card encrypt_code api
   * @param {String} encryptCode encrypt_code of real card code
   * @param {object} qs querystring object to send with the request
   * @return {Promise}
   */
  async sendDecodeRequest(encryptCode, qs): Promise<object> {
    return utils.sendWechatRequest(this.options.decodeCardCodeUrl, {
      searchParams: qs,
      method: 'POST',
      json: {
        encrypt_code: encryptCode,
      },
    });
  }

  /**
   * Decode/Decrypt card encrypt_code to get real card code
   * @param {string} encryptCode
   * @return {Promise}
   */
  async decryptCardCode(encryptCode): Promise<object> {
    const info = await this.getGlobalToken();
    const accessToken = info.accessToken;
    const params = {
      access_token: accessToken,
    };
    try {
      return await this.sendDecodeRequest(encryptCode, params);
    } catch (reason) {
      debug('decode card encrypt_code failed!');
      //retry when access token error
      if (errorByAccessTokenRelated(reason.errcode)) {
        const info1 = await this.getGlobalToken(true);
        const accessToken = info1.accessToken;
        const params = {
          access_token: accessToken,
        };
        try {
          return await this.sendDecodeRequest(encryptCode, params);
        } catch (reason1) {
          debug('decode card encrypt_code failed again, tray again later!!!');
          return Promise.reject(reason1);
        }
      }
      return Promise.reject(reason);
    }
  }
}

export default Card;
