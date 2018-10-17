(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["WechatJSSDK"] = factory();
	else
		root["WechatJSSDK"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*!
 * @license MIT
 * Client side js to use wechat-jssdk, also works with other server side service.
 * https://github.com/JasonBoy/wechat-jssdk
 */



var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var document = window.document;
var location = window.location;

//default wechat script url
var defaultScriptUrl = location.protocol + '//res.wx.qq.com/open/js/jweixin-1.4.0.js';

//default apis with share-on-moment and share-on-chat
var defaultApiList = ['onMenuShareTimeline', 'onMenuShareAppMessage'];

var WechatJSSDK = function () {
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
    _classCallCheck(this, WechatJSSDK);

    //using new WechatJSSDK(config);
    if (this instanceof WechatJSSDK) {
      this.config = wechatConfig || {};
      if (this.config.customUrl) {
        defaultScriptUrl = this.config.customUrl;
        delete this.config.customUrl;
      }
      var apiList = this.config.jsApiList;
      //add more apis if passed in
      if (!apiList || apiList.length <= 0) {
        this.config.jsApiList = defaultApiList;
      } else {
        var i = 0;
        var length = defaultApiList.length;
        for (; i < length; i++) {
          var defaultItem = defaultApiList[i];
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


  _createClass(WechatJSSDK, [{
    key: 'signSignature',
    value: function signSignature(newSignConfig) {
      var _this = this;

      var selfConfig = this.config;
      var config = newSignConfig || selfConfig;
      var signConfig = {
        debug: this.debug,
        appId: selfConfig.appId,
        timestamp: config.timestamp || selfConfig.timestamp,
        nonceStr: config.nonceStr || selfConfig.nonceStr,
        signature: config.signature || selfConfig.signature,
        jsApiList: selfConfig.jsApiList.slice(0, selfConfig.jsApiList.length)
      };
      var debug = this.debug;
      if (!window.wx) {
        console.warn('wechat js not defined');
        return this;
      }
      var wx = window.wx;
      //export original wx object
      this.setOriginWx();
      wx.config(signConfig);
      wx.ready(function () {
        console.log('sign signature finished...');
        _this.setOriginWx();
        // debug && alert('sign signature finished...');
        config.success && config.success.call(_this, _this);
      });
      wx.error(function (err) {
        debug && alert('sign error: ' + JSON.stringify(err));
        _this.setOriginWx();
        config.error && config.error.call(_this, err, _this);
      });

      return this;
    }

    /**
     * Load wechat js script and sign the signature
     * @returns {WechatJSSDK}
     */

  }, {
    key: 'loadScript',
    value: function loadScript() {
      var _this2 = this;

      var ele = document.createElement('script');
      ele.type = 'text/javascript';
      ele.async = true;
      ele.onload = function () {
        console.log('Wechat script loaded successfully!');
        //init the wechat config
        _this2.signSignature();
      };
      ele.onerror = function (err) {
        console.error('Failed to load wechat script!');
        console.error(err);
        _this2.debug && alert('Cannot load wechat script!');
      };
      var linkEle = document.getElementsByTagName('script')[0];
      linkEle.parentNode.insertBefore(ele, linkEle);
      ele.src = defaultScriptUrl;
      return this;
    }

    /**
     * Quick way to set custom moment share configs
     * @param {object} info
     * @returns {WechatJSSDK}
     */

  }, {
    key: 'shareOnMoment',
    value: function shareOnMoment(info) {
      if (!info) return this;
      return this.callWechatApi('onMenuShareTimeline', info);
    }

    /**
     * Quick way to set custom chat share configs
     * @param {object} info
     * @returns {WechatJSSDK}
     */

  }, {
    key: 'shareOnChat',
    value: function shareOnChat(info) {
      if (!info) return this;
      return this.callWechatApi('onMenuShareAppMessage', info);
    }

    /**
     * Call any wechat api
     * @param {string} apiName
     * @param {object} config specific api config
     * @returns {WechatJSSDK}
     */

  }, {
    key: 'callWechatApi',
    value: function callWechatApi(apiName, config) {
      if (!apiName) return this;
      var debug = this.debug;
      if (this.config.jsApiList.indexOf(apiName) < 0) {
        debug && alert('the wechat api [' + apiName + '] you call was not registered, \npls add the api into your [jsApiList] config');
        return this;
      }
      var wx = this.getOriginalWx();
      var customAPI = wx[apiName];
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

  }, {
    key: 'getOriginalWx',
    value: function getOriginalWx() {
      return this.wx || window.wx;
    }

    /**
     * check and set the original wx to this
     * @returns {WechatJSSDK}
     */

  }, {
    key: 'setOriginWx',
    value: function setOriginWx() {
      if (!this.wx) {
        this.wx = window.wx;
      }
      return this;
    }
  }]);

  return WechatJSSDK;
}();

module.exports = WechatJSSDK;

/***/ })
/******/ ]);
});
//# sourceMappingURL=client.js.map