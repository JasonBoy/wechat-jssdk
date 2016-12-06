# wechat-jssdk [![Building Status](https://travis-ci.org/JasonBoy/wechat-jssdk.svg?branch=master)](https://travis-ci.org/JasonBoy/wechat-jssdk)

## THE NEXT MAJOR V3 WILL LEVERAGE ES6 FEATURES

WeChat/WeiXin JS-SDK integration with NodeJS, also support retrieving wechat user profile with web OAuth.  
#### The usage of this readme is for v3
For v1.x, pls checkout the [Readme on v1.x](https://github.com/JasonBoy/wechat-jssdk/tree/1.x)  
For v2.x, pls checkout the [Readme on v2.x](https://github.com/JasonBoy/wechat-jssdk/tree/2.x)  
[中文使用文档](https://github.com/JasonBoy/wechat-jssdk/wiki/%E4%B8%AD%E6%96%87%E4%BD%BF%E7%94%A8%E6%96%87%E6%A1%A3)
###Usage
`npm install wechat-jssdk --save`  
or try the new v3  
`npm install wechat-jssdk@next --save`  


```
const Wechat = require('wechat-jssdk');
const wx = new Wechat(wechatConfig);
```

Required `wechatConfig` info:  

```
{
  //set your oauth redirect url, defaults to localhost
  "wechatRedirectUrl": "http://yourdomain.com/wechat/oauth-callback",
  "wechatToken": "xxx",
  "appId": "xxx",
  "appSecret": "xxx",
}
```

For other url configuration, there are default values, you can checkout the `./lib/config.js`.
  
###Setup your Wechat ENV  
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
    wx.jssdk.getSignatureByURL(req.query.url).then(function(signatureData) {
      res.json(signatureDate);
    });  
  });
  ```
3.Now you can send the wx request in your browser to pass the verification.


###Client Side
`var WechatJSSDK = require('wechat-jssdk/lib/client')`  
in your client side js, or any other way you like to include this.
`var wechatObj = new WechatJSSDK(config)`  
or in other environment:  
`var wechatObj = new window.WechatJSSDK(config)`  
where config will be: 

```javascript
var config = {
  //must has properties to finish the wechat signature verification
  'appId': 'xxx',
  'nonceStr': 'xxx', //the four properties below should be received like api '/get-signature' above
  'signature': 'xxx',
  'timestamp': 'xxx',
  //below are optional
  'success': function(){}, //invoked if wechat signature sign succeeds, same as successCallback
  'error': function(err){}, //invoked if sign failed, same as errorCallback
  'debug': true, //enable debug mode, same as debug, property in `config` object has higher priority
  'jsApiList': [], //optional, pass all the jsapi you want, the default will be ['onMenuShareTimeline', 'onMenuShareAppMessage']
  'customUrl': '' //set custom weixin js script url
}
```
after signature signed, you can customize the share information:  

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


###Using Stores (new in v3)

Stores are used to save url signatures into files, dbs, etc..., but also keep a copy in memory for better performence.  
The default store used is `FileStore` which will persist tokens and signatures into `wechat-info.json` file every 10 minutes, also it will load these info from the file in next initialization.  
Built in Stores: `FileStore`, `MongoStore`,  
#### Using Custom Stores: 

```javascript
...
const MongoStore = require('wechat-jssdk/lib/store/MongoStore');
const FileStore = require('wechat-jssdk/lib/store/FileStore');
const wx = new Wechat({
	appId: 'xxx',
	...,
	//file store
	//store: new FileStore(),
	//======
	//pass the MongoStore instance to config
	//default 127.0.0.1:27017/wechat db, no need to pass anything to constructor
	store: new MongoStore({
		dbName: 'myWechat', //default wechat
		dbAddress: 'mongodb://127.0.0.1:27017/wechat', //set the whole connection uri by yourself
		dbOptions: {}, //set mongoose connection config
	}) 
})

```

#### Create your own Store

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


###OAuth
Wechat support web OAuth to get user profile in wechat app.
In your page, provide a link, which you can get by `wx.oauth.snsUserInfoUrl` which is the default oauth url, to the wechat OAuth page,  
also you need provide a callback url(as show below) to get the wechat code after user click Agree button, the callback url is configured in the `wechatConfig` object above while initializing, but you can customize your own callback url by using `wx.oauth.generateOauthUrl(customUrl, isBaseUrl)` api.
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

###APIs
see [API wiki](https://github.com/JasonBoy/wechat-jssdk/wiki/API)

### LICENSE

MIT
