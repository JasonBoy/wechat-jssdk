import debugFnc from 'debug';
import { createDecipheriv } from 'crypto';
import isEmpty from 'lodash.isempty';
import * as utils from './utils';
import { getDefaultConfiguration } from './config';

import Store from './store/Store';
import FileStore from './store/FileStore';

const debug = debugFnc('wechat-MiniProgram');

const wxConfig = getDefaultConfiguration();

class MiniProgram {
  miniProgramOptions: object;
  wechatConfig: object;
  appId: string;
  appSecret: string;
  store: Store;
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
      miniOptions,
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
  async getSession(code, key): Promise<object> {
    try {
      const data = await utils.sendWechatRequest(
        this.miniProgramOptions.GET_SESSION_KEY_URL,
        {
          searchParams: {
            appid: this.appId,
            secret: this.appSecret,
            js_code: code,
            grant_type: 'authorization_code',
          },
        },
      );
      await this.store.setMPSession(key || data.openid, data);
      return Promise.resolve(data);
    } catch (err) {
      debug(err);
      return Promise.reject(err);
    }
  }

  /**
   * Generate mini program signature with raw data and session key
   * @param {string} rawDataString
   * @param sessionKey
   * @return {Promise<string>} Promise - generated signature
   */
  async genSignature(rawDataString, sessionKey): Promise<string> {
    return Promise.resolve(utils.genSHA1(rawDataString + sessionKey));
  }

  /**
   * Verify the provided signature and generated signature with the rawData
   * @param {object|string} rawData - raw data on which the signature will be generated
   * @param {string} signature - on which the generated signature will be compared upon
   * @param sessionKey
   * @return {Promise} Promise - resolved if signatures match, otherwise reject
   */
  async verifySignature(rawData, signature, sessionKey): Promise<void> {
    if ('object' === typeof rawData) {
      rawData = JSON.stringify(rawData);
    }
    const genSig = await this.genSignature(rawData, sessionKey);
    if (genSig === signature) {
      return Promise.resolve();
    }
    return Promise.reject(
      new Error(
        `verify signature failed: 
          expected: ${signature}
          generated: ${genSig}
        `,
      ),
    );
  }

  /**
   * Decrypt data from wechat
   * @param {string} encryptedData
   * @param {string} iv
   * @param {string=} sessionKey - session_key used to decrypt encryptedData
   * @param {string=} key - get the session_key with key(usually is openid) from Store if the above "sessionKey" is not provided
   * @return {Promise<object>} Promise - resolved/rejected with decrypted data or Error
   */
  async decryptData(encryptedData, iv, sessionKey, key): Promise<object> {
    /* istanbul ignore if  */
    if (!sessionKey && !key) {
      return Promise.reject(
        new Error('one of "sessionKey" or "key" must be provided!'),
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

    try {
      const sessionKey1 = await p;
      const aesKey = utils.createBufferFromBase64(sessionKey1);
      const aesIV = utils.createBufferFromBase64(iv);
      let decoded;
      try {
        const decipher = createDecipheriv('aes-128-cbc', aesKey, aesIV);
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
    } catch (err1) {
      /* istanbul ignore next  */
      return Promise.reject(err1);
    }
  }
}

export default MiniProgram;
