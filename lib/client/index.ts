/*!
 * @license MIT
 * Client side js to use wechat-jssdk, also works with other server side service.
 * https://github.com/JasonBoy/wechat-jssdk
 */

interface SignConfigOptions {
  debug?: boolean;
  appId?: string;
  timestamp?: string;
  nonceStr?: string;
  signature?: string;
  jsApiList?: string[];
}
interface WeChatJSSDKConfig extends SignConfigOptions {
  customUrl?: string;
}
interface WeChatJSSDKInterface {
  config: (config: SignConfigOptions) => void;
  ready: (cb: () => void) => void;
  error: (cb: (err: unknown) => void) => void;
  //functional jssdk function
  onMenuShareTimeline: (
    config: Record<string, unknown>,
    cb?: () => void,
  ) => void;
  onMenuShareAppMessage: (
    config: Record<string, unknown>,
    cb?: () => void,
  ) => void;
  onMenuShareQQ: (config: Record<string, unknown>, cb?: () => void) => void;
  onMenuShareWeibo: (config: Record<string, unknown>, cb?: () => void) => void;
  onMenuShareQZone: (config: Record<string, unknown>, cb?: () => void) => void;
  previewImage: (config: Record<string, unknown>, cb?: () => void) => void;
  getLocation: (config: Record<string, unknown>, cb?: () => void) => void;
  openProductSpecificView: (
    config: Record<string, unknown>,
    cb?: () => void,
  ) => void;
  addCard: (config: Record<string, unknown>, cb?: () => void) => void;
  openCard: (config: Record<string, unknown>, cb?: () => void) => void;
  chooseWXPay: (config: Record<string, unknown>, cb?: () => void) => void;
  openEnterpriseRedPacket: (
    config: Record<string, unknown>,
    cb?: () => void,
  ) => void;
  startSearchBeacons: (
    config: Record<string, unknown>,
    cb?: () => void,
  ) => void;
  stopSearchBeacons: (config: Record<string, unknown>, cb?: () => void) => void;
  onSearchBeacons: (config: Record<string, unknown>, cb?: () => void) => void;
  consumeAndShareCard: (
    config: Record<string, unknown>,
    cb?: () => void,
  ) => void;
  openAddress: (config: Record<string, unknown>, cb?: () => void) => void;
}

declare let wx: WeChatJSSDKInterface;

//default wechat script url
const defaultScriptUrl = '//res.wx.qq.com/open/js/jweixin-1.4.0.js';

//default apis with share-on-moment and share-on-chat
const defaultApiList = ['onMenuShareTimeline', 'onMenuShareAppMessage'];

/**
 * Initialize the WechatJSSDK instance
 * @param {object} wechatConfig, should contain like:
 *   {
 *      appId: 'xxxx',
 *      timestamp: '',
 *      nonceStr: '',
 *      signature: '',
 *      jsApiList: ['onMenuShareTimeline', 'onMenuShareAppMessage', ...],
 *      customUrl: 'http://res.wx.qq.com/open/js/jweixin-1.0.0.js' // set custom weixin script url
 *   }
 * @returns {WechatJSSDK}
 */
class WechatJSSDK {
  sdkUrl: string;
  config: WeChatJSSDKConfig;
  debug: boolean;
  wx: WeChatJSSDKInterface;

  constructor(wechatConfig: WeChatJSSDKConfig) {
    //using new WechatJSSDK(config);
    if (this instanceof WechatJSSDK) {
      this.sdkUrl = defaultScriptUrl;
      this.config = wechatConfig || {};
      if (this.config.customUrl) {
        this.sdkUrl = this.config.customUrl;
      }
      const apiList = this.config.jsApiList;
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
      return this;
    }
    return new WechatJSSDK(wechatConfig);
  }

  /**
   * Initialize wechat config
   */
  initialize(): Promise<WechatJSSDK> {
    return this.loadScript();
  }

  /**
   * Sign the signature now
   * @param {object} [newSignConfig], debug mode, appId, jsApiList cannot be changed!!!
   *        , should only provide new signature specific config
   */
  signSignature(newSignConfig?: SignConfigOptions): Promise<WechatJSSDK> {
    const selfConfig = this.config;
    const config = newSignConfig || selfConfig;
    const signConfig: SignConfigOptions = {
      debug: this.debug,
      appId: selfConfig.appId,
      timestamp: config.timestamp || selfConfig.timestamp,
      nonceStr: config.nonceStr || selfConfig.nonceStr,
      signature: config.signature || selfConfig.signature,
      jsApiList: selfConfig.jsApiList.slice(0, selfConfig.jsApiList.length),
    };
    const debug = this.debug;
    return new Promise((resolve, reject) => {
      if (!wx) {
        return reject(new Error('wx js not defined'));
      }
      //export original wx object
      this.setOriginWx();
      wx.config(signConfig);
      wx.ready(() => {
        console.log('sign signature finished...');
        this.setOriginWx();
        resolve(this);
      });
      wx.error((err) => {
        debug && alert('sign error: ' + JSON.stringify(err));
        this.setOriginWx();
        reject(err);
      });
    });
  }

  /**
   * Load wechat js script and sign the signature
   */
  loadScript(): Promise<WechatJSSDK> {
    return new Promise((resolve, reject) => {
      const ele = document.createElement('script');
      ele.type = 'text/javascript';
      ele.async = true;
      ele.onload = () => {
        console.log('Wechat script loaded successfully!');
        //init the wechat config
        this.signSignature()
          .then((instance) => {
            resolve(instance);
          })
          .catch((err) => {
            reject(err);
          });
      };
      ele.onerror = (err) => {
        console.error('Failed to load wechat script!');
        console.error(err);
        this.debug && alert('Cannot load wechat script!');
        reject(err);
      };
      const linkEle = document.getElementsByTagName('script')[0];
      linkEle.parentNode.insertBefore(ele, linkEle);
      ele.src = this.sdkUrl;
    });
  }

  /**
   * Quick way to set custom moment share configs
   * @param {object} info
   * @deprecated 'onMenuShareTimeline is deprecated in jweixin-v1.4.0,
   * use #instance.callWechatApi('updateTimelineShareData', config) instead
   * @returns {WechatJSSDK}
   */
  shareOnMoment(info: Record<string, unknown>): WechatJSSDK {
    if (!info) return this;
    return this.callWechatApi('onMenuShareTimeline', info);
  }

  /**
   * Quick way to set custom chat share configs
   * @param {object} info
   * @deprecated 'onMenuShareAppMessage is deprecated in jweixin-v1.4.0,
   * use #instance.callWechatApi('updateAppMessageShareData', config) instead
   * @returns {WechatJSSDK}
   */
  shareOnChat(info: Record<string, unknown>): WechatJSSDK {
    if (!info) return this;
    return this.callWechatApi('onMenuShareAppMessage', info);
  }

  /**
   * Call any wechat api
   * @param {string} apiName
   * @param {object} config specific api config
   * @param {function=} cb wx api callback in v1.4
   * @returns {WechatJSSDK}
   */
  callWechatApi(
    apiName: string,
    config: Record<string, unknown>,
    cb?: () => void,
  ): WechatJSSDK {
    if (!apiName) return this;
    const debug = this.debug;
    if (this.config.jsApiList.indexOf(apiName) < 0) {
      debug &&
        alert(
          'the wechat api [' +
            apiName +
            '] you call was not registered, \npls add the api into your [jsApiList] config',
        );
      return this;
    }
    const wx = this.getOriginalWx();
    const customAPI = wx[apiName];
    if (!customAPI || 'function' !== typeof customAPI) {
      debug && alert('no such api [' + apiName + '] found!');
      return this;
    }
    customAPI(config, cb);
    return this;
  }

  /**
   * get the original wx object directly
   * @return {*}
   */
  getOriginalWx(): WeChatJSSDKInterface {
    return this.wx || wx;
  }

  /**
   * check and set the original wx to this
   * @returns {WechatJSSDK}
   */
  setOriginWx(): WechatJSSDK {
    if (!this.wx) {
      this.wx = wx;
    }
    return this;
  }
}

export default WechatJSSDK;
