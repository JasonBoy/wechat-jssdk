# wechat-jssdk
WeChat/WeiXin JS-SDK integration with NodeJS 

###Usage
```
var wx = require('wechat-jssdk');
wx.initialize(wechatConfig);
```

Required `wechatConfig` info:  
```
{
  "wechatRedirectHost": "http://127.0.0.1",
  "wechatToken": "",
  "appId": "",
  "appSecret": "",
}
```

For other url configuration, there are default values, you can checkout the `./lib/config.js`.
  
###Setup your Wechat ENV  
1.Set your URL and Token in [Wechat Website](https://mp.weixin.qq.com/advanced/advanced?action=dev&t=advanced/dev&token=1244756112&lang=zh_CN)  
  you should provide a api(e.g `/api/wechat`) to let wechat verify your validation, 
  in your router: 
  ```
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
  ```
  router.get('/get-signature', function(req, res) {
    wx.jssdk.createNewSignatureForClient(req.query.url, function(signatureDate) {
      res.json(signatureDate);
    });
  });
  ```
3.Now you can send the wx request in your browser to pass the verification.

###APIs
see [API wiki](https://github.com/JasonBoy/wechat-jssdk/wiki/API)

###To Be Continued...