# wechat-jssdk [![Building Status](https://travis-ci.org/JasonBoy/wechat-jssdk.svg?branch=master)](https://travis-ci.org/JasonBoy/wechat-jssdk)
WeChat/WeiXin JS-SDK integration with NodeJS, also support retrieving wechat user profile with web OAuth.  
For v1.x, pls checkout the [Readme on v1.x](https://github.com/JasonBoy/wechat-jssdk/tree/1.x)  
[中文使用文档v1.x](https://github.com/JasonBoy/wechat-jssdk/wiki/%E4%B8%AD%E6%96%87%E4%BD%BF%E7%94%A8%E6%96%87%E6%A1%A3) 
###Usage
`npm install wechat-jssdk --save`  
```
var wx = require('wechat-jssdk');
wx.initialize(wechatConfig);
```

Required `wechatConfig` info:  
```
{
  "wechatRedirectUrl": "http://yourdomain.com/wechat/oauth-callback", //set your oauth redirect url, defaults to localhost
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
  var wx = require('wechat-jssdk');
  wx.initialize(wechatConfig);
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
`var wechat = require('wechat-jssdk/client')` in your client side js, or anyother way you like to include this.  
`var wechatObj = new wechat(config)` or `var wechatObj = wechat(config)`  
or in other environment: `var wechatObj = window._wechat_jssdk(config)`  
where config will be: 

```javascript
var config = {
  //must has properties to finish the wechat signature verification
  'appId': 'xxx',
  'nonceStr': 'xxx', //the four properties below should be received like api '/get-signature' above
  'signature': 'xxx',
  'timestamp': 'xxx',
  'url': 'url',
  //below are optional
  'success': function(){}, //invoked if wechat signature sign succeeds, same as successCallback
  'error': function(err){}, //invoked if sign failed, same as errorCallback
  'debug': true, //enable debug mode, same as debug, property in `config` object has higher priority
  'jsApiList': [] //optional, pass all the jsapi you want, the default will be ['onMenuShareTimeline', 'onMenuShareAppMessage']
}
```
after signature signed, you can customize the share information:  
```javascript
//customize share on chat info
wechatObj.setChatConfig({
  title: 'title',
  link: location.href,
  imgUrl: '/logo.png',
  desc: 'description'
});
//customize share on timeline info
wechatObj.setMomentConfig({
  title: 'title',
  link: location.href,
  imgUrl: '/logo.png'
});
```
You can also access the original wechat object `wx` from `window.wx` or from `wechatObj.wx` to call other apis.  
Also you can update the sign config if it fails, pass the new must has configs to `wechatObj.updateConfig(newSignatureConfig)`, and then call `wechatObj.signSignature()` to resign the signature.

###OAuth
Wechat support web OAuth to get user profile in wechat app.
In your page, provide a link, which you can get by using `wx.oauth.snsUserInfoUrl` in node, to the wechat OAuth page,  
also you need provide a callback route(as show below) to get the wechat code after user click Agree button, the callback url is configured in the `wechatConfig` object above while initializing: 
```javascript
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
