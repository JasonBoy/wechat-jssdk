'use strict';

const debug = require('debug')('wechat-MiniProgram');
const crypto = require('crypto');
const isEmpty = require('lodash.isempty');

const utils = require('./utils');
const config = require('./config');

const Store = require('./store/Store');
const FileStore = require('./store/FileStore');

const wxConfig = config.getDefaultConfiguration();

class MiniProgram {
  /**
   * Wechat mini program class, must have "options.miniProgram" option
   * @constructor
   * @param options
   * @return {MiniProgram} MiniProgram instance
   */
  constructor(options = {}) {
    // config.checkPassedConfiguration(options);

    let miniOptions = options.miniProgram || /* istanbul ignore next  */ {};

    /* istanbul ignore if  */
    if (!miniOptions.appId) {
      throw new Error('wechat mini program appId not found');
    }

    /* istanbul ignore if  */
    if (!miniOptions.appSecret) {
      throw new Error('wechat mini program appSecret not found');
    }

    this.miniProgramOptions = miniOptions = Object.assign(
      {},
      wxConfig.miniProgram,
      miniOptions
    );
    options.miniProgram = miniOptions;

    this.wechatConfig = isEmpty(options)
      ? /* istanbul ignore next  */ wxConfig
      : Object.assign({}, wxConfig, options);
    //alias
    this.appId = miniOptions.appId;
    this.appSecret = miniOptions.appSecret;

    /* istanbul ignore else  */
    if (
      !options.store ||
      /* istanbul ignore next  */ !(options.store instanceof Store)
    ) {
      debug('[MiniProgram]Store not provided, using default FileStore...');
      this.store = new FileStore(options.storeOptions);
    } else {
      this.store = options.store;
    }
  }

  /**
   * Get the new session from wechat
   * @param code - code from wx.login()
   * @param key - key used to store the session data, default will use the openid
   * @return {Promise<Object>}
   */
  getSession(code, key) {
    return utils
      .sendWechatRequest({
        uri: this.miniProgramOptions.GET_SESSION_KEY_URL,
        qs: {
          appid: this.appId,
          secret: this.appSecret,
          js_code: code,
          grant_type: 'authorization_code',
        },
      })
      .then(data => {
        return this.store.setMPSession(key || data.openid, data).then(() => {
          return Promise.resolve(data);
        });
      })
      .catch(err => {
        debug(err);
        return Promise.reject(err);
      });
  }

  /**
   * Generate mini program signature with raw data and session key
   * @param {string} rawDataString
   * @param sessionKey
   * @return {Promise<string>} Promise - generated signature
   */
  genSignature(rawDataString, sessionKey) {
    return Promise.resolve(utils.genSHA1(rawDataString + sessionKey));

    // return this.store.getMPSessionKey().then(sessionKey => {
    //   return Promise.resolve(utils.genSHA1(rawDataString + sessionKey));
    // });
  }

  /**
   * Verify the provided signature and generated signature with the rawData
   * @param {object|string} rawData - raw data on which the signature will be generated
   * @param {string} signature - on which the generated signature will be compared upon
   * @param sessionKey
   * @return {Promise} Promise - resolved if signatures match, otherwise reject
   */
  verifySignature(rawData, signature, sessionKey) {
    if ('object' === typeof rawData) {
      rawData = JSON.stringify(rawData);
    }
    return this.genSignature(rawData, sessionKey).then(genSig => {
      if (genSig === signature) {
        return Promise.resolve();
      }
      return Promise.reject(
        new Error(
          `verify signature failed: 
          expected: ${signature}
          generated: ${genSig}
        `
        )
      );
    });
  }

  /**
   * Decrypt data from wechat
   * @param {string} encryptedData
   * @param {string} iv
   * @param {string=} sessionKey - session_key used to decrypt encryptedData
   * @param {string=} key - get the session_key with key(usually is openid) from Store if the above "sessionKey" is not provided
   * @return {Promise<object|Error>} Promise - resolved/rejected with decrypted data or Error
   */
  decryptData(encryptedData, iv, sessionKey, key) {
    /* istanbul ignore if  */
    if (!sessionKey && !key) {
      return Promise.reject(
        new Error('one of "sessionKey" or "key" must be provided!')
      );
    }
    const data = utils.createBufferFromBase64(encryptedData);
    let p;
    /* istanbul ignore if  */
    if (!sessionKey && key) {
      p = this.store.getMPSessionKey(key);
    } else {
      p = Promise.resolve(sessionKey);
    }

    return p
      .then(sessionKey => {
        const aesKey = utils.createBufferFromBase64(sessionKey);
        const aesIV = utils.createBufferFromBase64(iv);
        let decoded;
        try {
          const decipher = crypto.createDecipheriv(
            'aes-128-cbc',
            aesKey,
            aesIV
          );
          decipher.setAutoPadding(true);
          decoded = decipher.update(data, 'binary', 'utf8');
          decoded += decipher.final('utf8');
          decoded = JSON.parse(decoded);
        } catch (err) {
          /* istanbul ignore next */
          debug(err);
          return Promise.reject(err);
        }
        /* istanbul ignore if  */
        if (!decoded.watermark || decoded.watermark.appid !== this.appId) {
          const msg = 'appId not match in watermark';
          debug(msg);
          return Promise.reject(new Error(msg));
        }
        return Promise.resolve(decoded);
      })
      .catch(err => {
        /* istanbul ignore next  */
        return Promise.reject(err);
      });
  }
}

module.exports = MiniProgram;
