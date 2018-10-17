/*!
 * @license MIT
 * Client side js to use wechat-jssdk, also works with other server side service.
 * https://github.com/JasonBoy/wechat-jssdk
 */

'use strict';

const document = window.document;
const location = window.location;

//default wechat script url
let defaultScriptUrl =
  location.protocol + '//res.wx.qq.com/open/js/jweixin-1.4.0.js';

//default apis with share-on-moment and share-on-chat
const defaultApiList = ['onMenuShareTimeline', 'onMenuShareAppMessage'];

class WechatJSSDK {
  /**
   * Initialize the WechatJSSDK instance
   * @constructor
   * @param {object} wechatConfig, should contain like:
   *   {
   *      appId: 'xxxx',
   *      timestamp: '',
   *      nonceStr: '',
   *      signature: '',
   *      jsApiList: ['onMenuShareTimeline', 'onMenuShareAppMessage', ...],
   *      success: function(){}, //sign success callback
   *      error: function(){}, //sign error callback
   *      customUrl: 'http://res.wx.qq.com/open/js/jweixin-1.0.0.js' // set custom weixin script url
   *   }
   * @returns {WechatJSSDK}
   */
  constructor(wechatConfig) {
    //using new WechatJSSDK(config);
    if (this instanceof WechatJSSDK) {
      this.config = wechatConfig || {};
      if (this.config.customUrl) {
        defaultScriptUrl = this.config.customUrl;
        delete this.config.customUrl;
      }
      let apiList = this.config.jsApiList;
      //add more apis if passed in
      if (!apiList || apiList.length <= 0) {
        this.config.jsApiList = defaultApiList;
      } else {
        let i = 0;
        const length = defaultApiList.length;
        for (; i < length; i++) {
          const defaultItem = defaultApiList[i];
          if (apiList.indexOf(defaultItem) < 0) {
            apiList.push(defaultItem);
          }
        }
      }
      this.debug = !!this.config.debug;
      this.loadScript();
      return this;
    }
    return new WechatJSSDK(wechatConfig);
  }

  /**
   * Sign the signature now
   * @param {object} [newSignConfig], debug mode, appId, jsApiList cannot be changed!!!
   *        , should only provide new signature specific config
   * @returns {WechatJSSDK} sdk instance
   */
  signSignature(newSignConfig) {
    const selfConfig = this.config;
    const config = newSignConfig || selfConfig;
    const signConfig = {
      debug: this.debug,
      appId: selfConfig.appId,
      timestamp: config.timestamp || selfConfig.timestamp,
      nonceStr: config.nonceStr || selfConfig.nonceStr,
      signature: config.signature || selfConfig.signature,
      jsApiList: selfConfig.jsApiList.slice(0, selfConfig.jsApiList.length),
    };
    const debug = this.debug;
    if (!window.wx) {
      console.warn('wechat js not defined');
      return this;
    }
    const wx = window.wx;
    //export original wx object
    this.setOriginWx();
    wx.config(signConfig);
    wx.ready(() => {
      console.log('sign signature finished...');
      this.setOriginWx();
      // debug && alert('sign signature finished...');
      config.success && config.success.call(this, this);
    });
    wx.error(err => {
      debug && alert('sign error: ' + JSON.stringify(err));
      this.setOriginWx();
      config.error && config.error.call(this, err, this);
    });

    return this;
  }

  /**
   * Load wechat js script and sign the signature
   * @returns {WechatJSSDK}
   */
  loadScript() {
    const ele = document.createElement('script');
    ele.type = 'text/javascript';
    ele.async = true;
    ele.onload = () => {
      console.log('Wechat script loaded successfully!');
      //init the wechat config
      this.signSignature();
    };
    ele.onerror = err => {
      console.error('Failed to load wechat script!');
      console.error(err);
      this.debug && alert('Cannot load wechat script!');
    };
    const linkEle = document.getElementsByTagName('script')[0];
    linkEle.parentNode.insertBefore(ele, linkEle);
    ele.src = defaultScriptUrl;
    return this;
  }

  /**
   * Quick way to set custom moment share configs
   * @param {object} info
   * @returns {WechatJSSDK}
   */
  shareOnMoment(info) {
    if (!info) return this;
    return this.callWechatApi('onMenuShareTimeline', info);
  }

  /**
   * Quick way to set custom chat share configs
   * @param {object} info
   * @returns {WechatJSSDK}
   */
  shareOnChat(info) {
    if (!info) return this;
    return this.callWechatApi('onMenuShareAppMessage', info);
  }

  /**
   * Call any wechat api
   * @param {string} apiName
   * @param {object} config specific api config
   * @returns {WechatJSSDK}
   */
  callWechatApi(apiName, config) {
    if (!apiName) return this;
    const debug = this.debug;
    if (this.config.jsApiList.indexOf(apiName) < 0) {
      debug &&
        alert(
          'the wechat api [' +
            apiName +
            '] you call was not registered, \npls add the api into your [jsApiList] config'
        );
      return this;
    }
    const wx = this.getOriginalWx();
    let customAPI = wx[apiName];
    if (!customAPI || 'function' !== typeof customAPI) {
      debug && alert('no such api [' + apiName + '] found!');
      return this;
    }
    customAPI(config);
    return this;
  }

  /**
   * get the original wx object directly
   * @return {*}
   */
  getOriginalWx() {
    return this.wx || window.wx;
  }

  /**
   * check and set the original wx to this
   * @returns {WechatJSSDK}
   */
  setOriginWx() {
    if (!this.wx) {
      this.wx = window.wx;
    }
    return this;
  }
}

module.exports = WechatJSSDK;
