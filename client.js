/**
 * @license MIT
 * client side js to use wechat jssdk,
 * https://github.com/JasonBoy/wechat-jssdk
 */

;!(function(window, document, location) {
  var _script_url = location.protocol + '//res.wx.qq.com/open/js/jweixin-1.0.0.js';
  var defaultApiList = ['onMenuShareTimeline', 'onMenuShareAppMessage'];
  /**
   *
   * @param wechatConfig, should contain like:
   *   {
   *      appId: 'xxxx',
   *      timestamp: '',
   *      nonceStr: '',
   *      signature: '',
   *      jsApiList: ['onMenuShareTimeline', 'onMenuShareAppMessage']
   *   }
   * @param cbSuccess {function}
   * @param cbError {function}
   * @param debug {boolean}
   * @param customUrl
   * @returns {WechatJSSDK}
   */
  function WechatJSSDK (wechatConfig, cbSuccess, cbError, debug, customUrl) {
    customUrl && (_script_url = customUrl);
    //using new _wechat_jssdk(config);
    if(this instanceof WechatJSSDK) {
      this.config = wechatConfig;
      var apiList = this.config.jsApiList;
      if(!apiList || apiList.length <= 0) {
        this.config.jsApiList = defaultApiList;
      } else {
        for(var i = 0, length = defaultApiList.length; i < length; i++) {
          var defaultItem = defaultApiList[i];
          if(apiList.indexOf(defaultItem) < 0) {
            apiList.push(defaultItem);
          }
        }
      }
      this.debug = wechatConfig.hasOwnProperty('debug') ? wechatConfig.debug : true === debug;
      if(wechatConfig.success) {
        this.cbSuccess = wechatConfig.success;
        delete wechatConfig.success;
      } else {
        this.cbSuccess = cbSuccess;
      }
      if(wechatConfig.error) {
        this.cbError = wechatConfig.error;
        delete wechatConfig.error;
      } else {
        this.cbError = cbError;
      }
      this.loadScript();
    } else {
      return new WechatJSSDK(wechatConfig, cbSuccess, cbError, debug, customUrl);
    }
  }

  var _moment_config = {
    title: document.title,
    link: location.href,
    type: 'link'
    // imgUrl: location.origin + '/public/img/logo.png'
  };
  var _chat_config = {
    title: document.title,
    link: location.href,
    type: 'link',
    desc: document.title
  };

  WechatJSSDK.prototype.signSignature = function() {
    var self = this;
    var config = this.config;
    var debug = this.debug;
    if(debug) {
      config.debug = debug;
    }
    if(!window.wx) {
      console.warn('wechat js not defined');
      return;
    }
    var wx = window.wx;
    wx.config(config);
    wx.ready(function () {
      console.log('sign signature finished...');
      debug && alert('sign signature finished...');
      //initialize share on moment and chat features
      wx['onMenuShareTimeline'](_moment_config);
      wx['onMenuShareAppMessage'](_chat_config);
      self.signFinished = true;
      self.cbSuccess && self.cbSuccess();
    });

    wx.error(function (err) {
      debug && alert(err ? ('sign err: ' + JSON.stringify(err)) : 'ok');
      self.cbError && self.cbError(err);
    });

    //export original wx object
    self.wx || (self.wx = wx);
  };
  
  WechatJSSDK.prototype.updateConfig = function(newConfig) {
    delete newConfig.success;
    delete newConfig.error;
    this.config = newConfig;
  };

  WechatJSSDK.prototype.loadScript = function() {
    var self = this;
    var ele = document.createElement('script');
    ele.src = _script_url;
    ele.async = true;
    var linkEle = document.getElementsByTagName('script')[0];
    linkEle.parentNode.insertBefore(ele, linkEle);
    ele.onload = function() {
      console.log('script loaded');
      //init the wechat config
      self.signSignature();
    };
  };

  WechatJSSDK.prototype.setMomentConfig = function(info) {
    if(!info) return;
    for(var key in info) {
      if(info.hasOwnProperty(key)) {
        _moment_config[key] = info[key];
      }
    }
  };

  WechatJSSDK.prototype.setChatConfig = function(info) {
    if(!info) return;
    for(var key in info) {
      if(info.hasOwnProperty(key)) {
        _chat_config[key] = info[key];
      }
    }
  };

  //call other wechat api manually
  WechatJSSDK.prototype.callWechatApi = function(apiName, config) {
    if(!apiName) return;
    if(this.config.jsApiList.indexOf(apiName) < 0) {
      debug && alert('the wechat api [' + apiName + '] you call was not registered, \npls add the api into your [jsApiList] config');
      return;
    }
    var customAPI = window.wx[apiName];
    if(!customAPI || 'function' !== typeof customAPI) {
      debug && alert('no such api [' + apiName + '] found!');
      return;
    }
    customAPI(config);
  };

  if('undefined' !== typeof module && 'undefined' !== typeof exports) {
    module.exports = WechatJSSDK;
  } else {
    window._wechat_jssdk = WechatJSSDK;
  }

})(window, document, window.location);