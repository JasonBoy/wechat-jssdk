# wechat-jssdk
[![npm](https://img.shields.io/npm/v/wechat-jssdk.svg)](https://www.npmjs.com/package/wechat-jssdk)
[![node](https://img.shields.io/node/v/wechat-jssdk.svg)](https://nodejs.org/)
[![Building Status](https://travis-ci.org/JasonBoy/wechat-jssdk.svg?branch=master)](https://travis-ci.org/JasonBoy/wechat-jssdk)
[![Coverage Status](https://coveralls.io/repos/github/JasonBoy/wechat-jssdk/badge.svg?branch=master)](https://coveralls.io/github/JasonBoy/wechat-jssdk?branch=master)
[![npm](https://img.shields.io/npm/l/wechat-jssdk.svg)](https://www.npmjs.com/package/wechat-jssdk)


Next-Generation WeChat JS-SDK integration with NodeJS(node >= 4),
with support for web OAuth to retrieve wechat user profile.

For v2.x(node >= 0.10), pls checkout the [Readme on v2.x](https://github.com/JasonBoy/wechat-jssdk/tree/2.x)

[中文使用文档](https://github.com/JasonBoy/wechat-jssdk/wiki/%E4%B8%AD%E6%96%87%E4%BD%BF%E7%94%A8%E6%96%87%E6%A1%A3)

## Features

  1. [JSSDK](#setup-your-wechat-env)
  1. [Browser-Side Usage](#browser-side-usage)
  1. [OAuth](#oauth)
  1. [Using Stores](#using-stores)

## Usage

`npm install wechat-jssdk --save`  

```
const Wechat = require('wechat-jssdk');
const wx = new Wechat(wechatConfig);
```

Required `wechatConfig` info:  

```
{
  //set your oauth redirect url, defaults to localhost
  "wechatRedirectUrl": "http://yourdomain.com/wechat/oauth-callback",
  "wechatToken": "wechat_token",
  "appId": "appid",
  "appSecret": "app_secret",
}
```

For other url configuration, there are default values, you can checkout the `./lib/config.js`.

## Setup your Wechat ENV  
1.Set your URL and Token in [Wechat Website](https://mp.weixin.qq.com)  
  you should provide a api(e.g `/api/wechat`) to let wechat verify your validation,
  for example, in your router:

  ```javascript
  const Wechat = require('wechat-jssdk');
  const wx = new Wechat(wechatConfig);
  router.get('/api/wechat', function(req, res){
    if(wx.jssdk.verifySignature(req.query)) {
      res.send(req.query.echostr);
      return;
    }
    res.send("error");
  });
  ```
  if everything is OK, wechat will save your settings :).

2.You should also provide a api for your browser to get token for the current url  

  ```javascript
  router.get('/get-signature', function(req, res) {
    wx.jssdk.getSignature(req.query.url).then(function(signatureData) {
      res.json(signatureDate);
    });  
  });
  ```
3.Now you can send the wx request in your browser to pass the verification.


## Browser Side Usage
`var WechatJSSDK = require('wechat-jssdk/lib/client')`  
in your client side js, or any other way you like to include this.  
`var wechatObj = new WechatJSSDK(config)`  
or in traditional environment, use the prebuilt `./dist/client.min.js`:  
`var wechatObj = new window.WechatJSSDK(config)`  
where config will be:

```javascript
var config = {
  //below are mandatory options to finish the wechat signature verification
  'appId': 'app_id',
  //the 3 options below should be received like api '/get-signature' above
  'nonceStr': 'your_nonceStr',
  'signature': 'url_signature',
  'timestamp': 'your_timestamp',
  //below are optional
  //invoked if wechat signature sign succeeds
  'success': function(){},
  //invoked if sign failed
  'error': function(err){},
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
You can also access the original wechat object `wx` from `window.wx` or from `wechatObj.wx` to call other apis.
Also you can update the sign config if it fails, pass the new must has configs to `wechatObj.signSignature(newSignatureConfig)`.
`newSignatureConfig` should only has:
```
{
  'nonceStr': 'xxx',
  'signature': 'xxx',
  'timestamp': 'xxx',
}
```

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

## OAuth
Wechat support web OAuth to get user profile in wechat app.
In your page, provide a link, which you can get by `wx.oauth.snsUserInfoUrl` which is the default oauth url, to the wechat OAuth page,  
also you need provide a callback url(as show below) to get the wechat code after user click Agree button, the callback url is configured in the `wechatConfig` object above while initializing,
but you can customize your own callback url by using `wx.oauth.generateOAuthUrl(customUrl, scope, state)` api.
```javascript
//default callback url
router.get('/wechat/oauth-callback', function (req, res) {
  wx.oauth.getUserInfo(req.query.code)
          .then(function(userProfile) {
            console.log(userProfile)
            res.render("demo", {
              wechatInfo: userProfile
            });
          });
});
```

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

You can also create own Store to store tokens anywhere you want, by doing that, you may need to extend the base `Store` class, and reimplement the apis you need(take a look at Store.js):

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


## Demo

Use your own `appId` and `appSecret` in `./demo/index.js` to test

Use `npm start` to start the demo.

## LICENSE

MIT
