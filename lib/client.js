/*!
 * @license MIT
 * Client side js to use wechat-jssdk, also works with other server side service.
 * https://github.com/JasonBoy/wechat-jssdk
 */

;!(function (window, document, location) {
  'use strict';

  //default wechat script url
  let defaultScriptUrl = location.protocol + '//res.wx.qq.com/open/js/jweixin-1.0.0.js';

  //default apis with share-on-moment and share-on-chat
  const defaultApiList = ['onMenuShareTimeline', 'onMenuShareAppMessage'];

  //set some default share config
  const defaultMomentConfig = {
    title: document.title,
    link: location.href,
    type: 'link'
  };
  const defaultChatConfig = {
    title: document.title,
    link: location.href,
    type: 'link',
    desc: document.title
  };

  //sdk prototype
  const sdk = WechatJSSDK.prototype;

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
  function WechatJSSDK(wechatConfig) {
    //using new _wechat_jssdk(config);
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
  sdk.signSignature = function (newSignConfig) {
    const self = this;
    const selfConfig = self.config;
    const config = newSignConfig || selfConfig;
    const signConfig = {
      debug: self.debug,
      appId: selfConfig.appId,
      timestamp: config.timestamp || selfConfig.timestamp,
      nonceStr: config.nonceStr || selfConfig.nonceStr,
      signature: config.signature || selfConfig.signature,
      jsApiList: selfConfig.jsApiList
    };
    const debug = self.debug;
    if (!window.wx) {
      console.warn('wechat js not defined');
      return this;
    }
    const wx = window.wx;
    wx.config(signConfig);
    wx.ready(function () {
      console.log('sign signature finished...');
      debug && alert('sign signature finished...');
      //initialize share on moment and chat features
      wx['onMenuShareTimeline'](defaultMomentConfig);
      wx['onMenuShareAppMessage'](defaultChatConfig);
      self.signFinished = true;
      config.success && config.success.call(self);
    });

    wx.error(function (err) {
      debug && alert('sign error: ' + JSON.stringify(err));
      config.error && config.error.call(self, err);
    });

    //export original wx object
    self.wx || (self.wx = wx);
    return self;
  };

  /**
   * Load wechat js script and sign the signature
   * @returns {WechatJSSDK}
   */
  sdk.loadScript = function () {
    const self = this;
    const ele = document.createElement('script');
    ele.type = 'text\/javascript';
    ele.async = true;
    ele.onload = function () {
      console.log('Wechat script loaded successfully!');
      //init the wechat config
      self.signSignature();
    };
    ele.onerror = function (err) {
      console.error('Failed to load wechat script!');
      console.error(err);
      self.debug && alert('Cannot load wechat script!');
    };
    const linkEle = document.getElementsByTagName('script')[0];
    linkEle.parentNode.insertBefore(ele, linkEle);
    ele.src = defaultScriptUrl;
    return self;
  };

  /**
   * Quick way to set custom moment share configs
   * @param {object} info
   * @returns {WechatJSSDK}
   */
  sdk.setMomentConfig = function (info) {
    if (!info) return this;
    for (let key in info) {
      if (info.hasOwnProperty(key)) {
        defaultMomentConfig[key] = info[key];
      }
    }
    return this;
  };

  /**
   * Quick way to set custom chat share configs
   * @param {object} info
   * @returns {WechatJSSDK}
   */
  sdk.setChatConfig = function (info) {
    if (!info) return this;
    for (let key in info) {
      if (info.hasOwnProperty(key)) {
        defaultChatConfig[key] = info[key];
      }
    }
    return this;
  };

  /**
   * Call any wechat api
   * @param {string} apiName
   * @param {object} config specific api config
   * @returns {WechatJSSDK}
   */
  sdk.callWechatApi = function (apiName, config) {
    if (!apiName) return this;
    const debug = this.debug;
    if (this.config.jsApiList.indexOf(apiName) < 0) {
      debug && alert('the wechat api [' + apiName + '] you call was not registered, \npls add the api into your [jsApiList] config');
      return this;
    }
    let customAPI = this.wx[apiName];
    if (!customAPI || 'function' !== typeof customAPI) {
      debug && alert('no such api [' + apiName + '] found!');
      return this;
    }
    customAPI(config);
    return this;
  };

  if ('undefined' !== typeof module && 'undefined' !== typeof exports) {
    module.exports = WechatJSSDK;
  } else {
    window._wechat_jssdk = WechatJSSDK;
  }

})(window, document, window.location);