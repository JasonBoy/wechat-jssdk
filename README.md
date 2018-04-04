# wechat-jssdk
[![npm](https://img.shields.io/npm/v/wechat-jssdk.svg?style=flat-square)](https://www.npmjs.com/package/wechat-jssdk)
[![node](https://img.shields.io/node/v/wechat-jssdk.svg?style=flat-square)](https://nodejs.org/)
[![Building Status](https://img.shields.io/travis/JasonBoy/wechat-jssdk.svg?style=flat-square)](https://travis-ci.org/JasonBoy/wechat-jssdk)
[![Coverage Status](https://img.shields.io/coveralls/github/JasonBoy/wechat-jssdk.svg?style=flat-square)](https://coveralls.io/github/JasonBoy/wechat-jssdk)
[![npm](https://img.shields.io/npm/l/wechat-jssdk.svg?style=flat-square)](https://www.npmjs.com/package/wechat-jssdk)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)


Next-Generation WeChat JS-SDK integration with NodeJS(node >= 4).

[中文使用文档](https://github.com/JasonBoy/wechat-jssdk/wiki/%E4%B8%AD%E6%96%87%E4%BD%BF%E7%94%A8%E6%96%87%E6%A1%A3)

![wechat-jssdk-demo](https://raw.githubusercontent.com/JasonBoy/wechat-jssdk/master/demo/wechat-jssdk-demo-new.gif)

## Features

  - [:heartbeat:Server-Side](#usage)
  - [:heartpulse:Browser-Side](#browser-side-usage)
  - [:unlock:OAuth](#oauth)
  - [:fries:Cards and Offers(v3.1+)](#cards-and-offers)
  - [:credit_card:Wechat Payment(v3.1+)](#payment)
  - [:cd:Using Stores](#using-stores)
  - [:movie_camera:Full Featured Demo](#demo)

## Usage

`npm install wechat-jssdk --save` or    
`yarn add wechat-jssdk`  

```
const Wechat = require('wechat-jssdk');
const wx = new Wechat(wechatConfig);
```

## Wechat Config

`wechatConfig` info:  

```
{
  //set your oauth redirect url, defaults to localhost
  "wechatRedirectUrl": "http://yourdomain.com/wechat/oauth-callback",
  //"wechatToken": "wechat_token", //not necessary required
  "appId": "appid",
  "appSecret": "app_secret",
  card: true, //enable cards
  payment: true, //enable payment support
  merchantId: '', //
  paymentSandBox: true, //dev env
  paymentKey: '', //API key to gen payment sign
  paymentCertificatePfx: fs.readFileSync(path.join(process.cwd(), 'cert/apiclient_cert.p12')),
  //default payment notify url
  paymentNotifyUrl: `http://your.domain.com/api/wechat/payment/`,
}
```

### Setup your Wechat ENV  
1.Set your own URL in [Wechat Website](https://mp.weixin.qq.com)  
  
  Usually wechat will provide you a `MP_verify_XHZon7GAGRdcAFxx.txt` like file to ask you to put that on your website root,  
  which will be accessed by wechat on `http://yourdomain.com/MP_verify_XHZon7GAGRdcAFxx.txt` to verify that you own the domain.
  
2.You should also provide a api for your browser to get token for the current url, see [demo](#demo)  

  ```javascript
  //express app for example:
  router.get('/get-signature', (req, res) => {
    wx.jssdk.getSignature(req.query.url).then(signatureData => {
      res.json(signatureData);
    });  
  });
  ```
3.Now you can get to the next step in your browser to pass the verification.


## Browser Side Usage
`const WechatJSSDK = require('wechat-jssdk/dist/client')`
in your client side js, or any other way you like to include this.  
`const wechatObj = new window.WechatJSSDK(config)`  
where config will be:

```javascript
const config = {
  //below are mandatory options to finish the wechat signature verification
  'appId': 'app_id',
  //the 3 options below should be received like api '/get-signature' above
  'nonceStr': 'your_nonceStr',
  'signature': 'url_signature',
  'timestamp': 'your_timestamp',
  //below are optional
  //invoked if wechat signature sign succeeds,
  //'this' will be the jssdk instance if it's a normal function, 
  // in v3.0.10+, jssdk instance will be passed to the callback, (wxObj) => {}
  'success': jssdkInstance => {},
  //invoked if sign failed, in v3.0.10+, jssdk instance will be pass to the func, (err, wxObj) => {}
  'error': (err, jssdkInstance) => {},
  //enable debug mode, same as debug
  'debug': true,
  'jsApiList': [], //optional, pass all the jsapi you want, the default will be ['onMenuShareTimeline', 'onMenuShareAppMessage']
  'customUrl': '' //set custom weixin js script url, usually you don't need to add this js manually
}
```
after signature signed successfully, you can customize the share information:

```javascript
//customize share on chat info
//sugar method for `wechatObj.callWechatApi('onMenuShareAppMessage', {...})`
wechatObj.shareOnChat({
  type: 'link',
  title: 'title',
  link: location.href,
  imgUrl: '/logo.png',
  desc: 'description',
  success: function (){},
  cancel: function (){}
});
//customize share on timeline info
//sugar method
wechatObj.shareOnMoment({
  type: 'link',
  title: 'title',
  link: location.href,
  imgUrl: '/logo.png'
});
```
You can also access the original wechat object `wx` from `wechatObj.getOriginalWx()`.

Call other wechat apis: `wechatObj.callWechatApi(apiName, config)`:

```javascript
wechatObj.callWechatApi('onMenuShareAppMessage', {
  type: 'link',
  title: 'title',
  link: location.href,
  imgUrl: '/logo.png',
  desc: 'description',
  success: function (){},
  cancel: function (){}
});
```
or with the original one:  
`wechatObj.getOriginalWx().onMenuShareAppMessage(config)`

## OAuth
Wechat support web OAuth to get user profile in wechat app.
In your page, provide a link, which you can get by `wx.oauth.snsUserInfoUrl` which is the default oauth url, to the wechat OAuth page,  
also you need provide a callback url(as show below) to get the wechat code after user click Agree button, the callback url is configured in the `wechatConfig` object above while initializing,
but you can customize your own callback url by using `wx.oauth.generateOAuthUrl(customUrl, scope, state)` api.
```javascript
//in node: 
const wx = new Wechat(config);
const url = wx.oauth.generateOAuthUrl('http://mycustom.com/oauth-callback', 'snsapi_userinfo', 'custom_state');
res.render("oauth-page", {
  wechatOAuthUrl: url,
});
//insert "wechatOAuthUrl" into your html:

//custom callback url, agree clicked by user, come back here:
router.get('/oauth-callback', function (req, res) {
  wx.oauth.getUserInfo(req.query.code)
          .then(function(userProfile) {
            console.log(userProfile)
            res.render("demo", {
              wechatInfo: userProfile
            });
          });
});
```

## Cards and Offers

Set `card: true` in config to enable the cards support on server side, see [demo](#demo).  
For cards APIs, see [cards apis](https://github.com/JasonBoy/wechat-jssdk/wiki/API#card-apis)

## Payment

Set `payment: true` in config to enable the payment support on server side, you should also provide payment related info.  
See [demo](#demo).  
For payment APIs, see [payment apis](https://github.com/JasonBoy/wechat-jssdk/wiki/API#payment-apis)

## Using Stores

*New in V3*  
[Store](https://github.com/JasonBoy/wechat-jssdk/wiki/Store) are used to save url signatures into files, dbs, etc..., but also keep a copy in memory for better performence.
The default store used is `FileStore` which will persist tokens and signatures into `wechat-info.json` file every 10 minutes, also it will load these info from the file in next initialization.  
Built in Stores: `FileStore`, `MongoStore`,  
### Using Custom Stores:

```javascript
...
const Wechat = require('wechat-jssdk');
const MongoStore = Wechat.MongoStore;
const FileStore = Wechat.FileStore;
const wx = new Wechat({
	appId: 'xxx',
	...,
	//file store
	//store: new FileStore(),
	//======
	//pass the MongoStore instance to config
	//default 127.0.0.1:27017/wechat db, no need to pass anything to constructor
	store: new MongoStore({
		//dbName: 'myWechat', //default wechat
		dbAddress: 'mongodb://127.0.0.1:27017/wechat', //set the whole connection uri by yourself
		dbOptions: {}, //set mongoose connection config
	})
})

```

### Create your own Store

You can also create own Store to store tokens anywhere you want, by doing that, you may need to extend the base `Store` class, and reimplement the [apis](https://github.com/JasonBoy/wechat-jssdk/wiki/Store) you need:

```javascript
const Store = require('wechat-jssdk').Store;
class CustomStore extends Store {
	constructor (options) {
		super();
		console.log('using my own store!');
	}
}
```

## APIs
see [API wiki](https://github.com/JasonBoy/wechat-jssdk/wiki/API)

[A Blog About This](http://blog.lovemily.me/next-generation-wechat-jssdk-integration-with-nodejs/)

## Debug

Add `DEBUG=wechat*` when start your app to enable wechat-jssdk debug  
`DEBUG=wechat* node your-app.js`

## Demo

In v3.1.0, the demo page is updated to test the new added `Cards & Offers` and `Payment` support.  
Copy the `demo/wechat-config-sample.js` to `demo/wechat-config.js`,  
and use your own `appId`, `appSecret`, and other [configs](#wechat-config) like payment if your want to enable them. 

Use `npm start` or `npm run dev` to start the demo.

## LICENSE

MIT @ 2016-2018 [jason](http://blog.lovemily.me)
