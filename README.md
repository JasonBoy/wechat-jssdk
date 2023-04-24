# wechat-jssdk
[![npm](https://img.shields.io/npm/v/wechat-jssdk.svg?style=flat-square)](https://www.npmjs.com/package/wechat-jssdk)
[![node](https://img.shields.io/node/v/wechat-jssdk.svg?style=flat-square)](https://nodejs.org/)
[![Coverage Status](https://img.shields.io/coveralls/github/JasonBoy/wechat-jssdk.svg?style=flat-square)](https://coveralls.io/github/JasonBoy/wechat-jssdk)
[![npm](https://img.shields.io/npm/l/wechat-jssdk.svg?style=flat-square)](https://www.npmjs.com/package/wechat-jssdk)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

微信JSSDK与NodeJS及Web端整合
WeChat JS-SDK integration with NodeJS and Web.

[English](https://github.com/JasonBoy/wechat-jssdk/blob/master/README_EN.md)
| [Release Notes](https://github.com/JasonBoy/wechat-jssdk/releases)

![wechat-jssdk-demo](https://raw.githubusercontent.com/JasonBoy/wechat-jssdk/master/demo/wechat-jssdk-demo-new.gif)

## 主要功能

- [:heartbeat:服务端](#使用方法)
- [:heartpulse:浏览器端](#浏览器端)
- [:unlock:OAuth网页授权](#oauth)
- [:fries:微信卡券](#微信卡券)
- [:credit_card:微信支付](#微信支付)
- [:baby_chick:微信小程序](#小程序)
- [:cd:使用Stores](#使用Stores)
- [:movie_camera:完整 Demo](#demo)

## 使用方法
```bash
npm install wechat-jssdk --save
# 或者
yarn add wechat-jssdk
```

```javascript
const {Wechat} = require('wechat-jssdk');
const wx = new Wechat(wechatConfig);
```
### Wechat 配置项

`wechatConfig` 为以下格式:
```javascript
{
  //第一个为设置网页授权回调地址
  wechatRedirectUrl: "http://yourdomain.com/wechat/oauth-callback", 
  wechatToken: "xxx", //第一次在微信控制台保存开发者配置信息时使用
  appId: "xxx",
  appSecret: "xxx",
  card: true, //开启卡券支持，默认关闭
  payment: true, //开启支付支持，默认关闭
  merchantId: '', //商户ID
  paymentSandBox: true, //沙箱模式，验收用例
  paymentKey: '', //必传，验签密钥，TIP:获取沙箱密钥也需要真实的密钥，所以即使在沙箱模式下，真实验签密钥也需要传入。
  //pfx 证书
  paymentCertificatePfx: fs.readFileSync(path.join(process.cwd(), 'cert/apiclient_cert.p12')),
  //默认微信支付通知地址
  paymentNotifyUrl: `http://your.domain.com/api/wechat/payment/`,
  //小程序配置
  "miniProgram": {
    "appId": "mp_appid",
    "appSecret": "mp_app_secret",
  }
}
```

其他支持的设置都有默认值，基本都是微信API的地址，且基本不会改变, 可以查看 `./lib/config.js`.

## 设置微信环境
1.去<a href="https://mp.weixin.qq.com" target="_blank">微信公众平台</a>

下载类似 `MP_verify_XHZon7GAGRdcAFxx.txt` 这样的文件放到网站根目录, 如`http://yourdomain.com/MP_verify_XHZon7GAGRdcAFxx.txt`，微信会验证这个链接.

2.然后在你的express/koa app中提供一个接口给浏览器获取验证信息, @see [demo](#demo)

  ```javascript
  //express app:
  router.get('/get-signature', (req, res) => {
    wx.jssdk.getSignature(req.query.url).then(signatureData => {
      res.json(signatureData);
    });
  });
  //koa2/koa-router app:
  router.get('/get-signature', async ctx => {
    ctx.body = await wx.jssdk.getSignature(ctx.request.query.url);
  });
  ```
3.获取签名后，进入下一步浏览器端使用方法.

## 浏览器端
```javascript
const WechatJSSDK = require('wechat-jssdk/dist/client.umd');
//ES6 import
import WechatJSSDK from 'wechat-jssdk/dist/client.umd';

//没有打包的话直接script扔到html，然后从`window`获取, e.g:
const wechatObj = new window.WechatJSSDK(config)
```

`config`应该为:

```javascript
const config = {
  //前4个是微信验证签名必须的参数，第2-4个参数为类似上面 '/get-signature' 从node端获取的结果
  'appId': 'xxx',
  'nonceStr': 'xxx',
  'signature': 'xxx',
  'timestamp': 'xxx',
  //下面为可选参数
  'debug': true, //开启 debug 模式
  'jsApiList': [], //设置所有想要使用的微信jsapi列表, 默认值为 ['updateAppMessageShareData','updateTimelineShareData','onMenuShareTimeline', 'onMenuShareAppMessage']，分享到朋友圈及聊天记录
  'customUrl': '' //自定义微信js链接
}
const wechatObj = new WechatJSSDK(config);
wechatObj.initialize()
  .then(w => {
    //set up your share info, "w" is the same instance as "wechatObj"
  })
  .catch(err => {
    console.error(err);
  });
```
验证签名成功后, 就可以自定义你的分享内容了:
> sdk默认只注册了`updateAppMessageShareData`，`updateTimelineShareData`，`onMenuShareTimeline(wx即将废弃)`，`onMenuShareAppMessage(wx即将废弃)`
```javascript
//自定义分享到聊天窗口
//内部调用 `wechatObj.callWechatApi('updateAppMessageShareData', {...})`， 语法糖而已
wechatObj.updateAppMessageShareData({
  type: 'link',
  title: 'title',
  link: location.href,
  imgUrl: '/logo.png',
  desc: 'description',
  success: function (){},
  fail: function (){},
  complete: function (){},
  cancel: function (){}
});
//自定义分享到朋友圈
//语法糖
wechatObj.updateTimelineShareData({
  type: 'link',
  title: 'title',
  link: location.href,
  imgUrl: '/logo.png'
});
```
要获取原始的微信对象 `wx`，可以通过`wechatObj.getOriginalWx()`来获取。  
如果第一次验证失败，可以在`error`回调里更新签名信息，并重新发验证请求：   
`wechatObj.signSignature(newSignatureConfig);`, `newSignatureConfig`只需包含：
```
{
  'nonceStr': 'xxx',
  'signature': 'xxx',
  'timestamp': 'xxx',
}
```

调用其他微信接口：  
`wechatObj.callWechatApi(apiName, apiConfig)`  
`apiName`和`apiConfig`请参考微信官方接口文档

## OAuth
默认生成微信授权URL为 `wx.oauth.snsUserInfoUrl` 和 `wx.oauth.snsUserBaseUrl`，其中的默认回调URL为 `wechatConfig` 中配置的 `wechatRedirectUrl`.
你也可以通过调用 `wx.oauth. generateOAuthUrl(customUrl, scope, state)`来自定义回调地址
```javascript
//callback url handler
//如"wechatRedirectUrl"配置为 "http://127.0.0.1/wechat/oauth-callback", 你的路由需要为：
router.get('/wechat/oauth-callback', function (req, res) {
  //得到code，获取用户信息
  wx.oauth.getUserInfo(req.query.code)
          .then(function(userProfile) {
            console.log(userProfile)
            res.render("demo", {
              wechatInfo: userProfile
            });
          });
});
```
TIP: 确保上面的重定向地址域名已经在微信里的授权回调地址设置里设置过。
![](https://cloud.githubusercontent.com/assets/2911620/23061999/f95da3d4-f53e-11e6-9022-29ea33adb126.png)

## 微信卡券

在wechatConfig设置 `card: true` 来支持卡券功能的服务端支持, 参考[demo](#demo).  
要查看卡券 APIs, 参考 [cards apis](https://github.com/JasonBoy/wechat-jssdk/wiki/API#card-apis)

## 微信支付

在wechatConfig设置 `payment: true` 来支持微信支付功能的服务端支持, 其他一些支付必须的配置也需要一同设置.  
参考 [demo](#demo).  
要查看支付 APIs, 参考 [payment apis](https://github.com/JasonBoy/wechat-jssdk/wiki/API#payment-apis)

## 小程序

使用小程序的服务端支持([看接口](https://github.com/JasonBoy/wechat-jssdk/wiki/API#mini-programv4)), 在配置里设置小程序的`appId` 和 `appSecret`:
```javascript
const { Wechat, MiniProgram } = require('wechat-jssdk');
const wechatConfig = {
  "appId": "appid",
  "appSecret": "app_secret",
  //...other configs
  //...
  //小程序配置
  "miniProgram": {
    "appId": "mp_appid",
    "appSecret": "mp_app_secret",
  }
};
const wx = new Wechat(wechatConfig);
//调用小程序接口
wx.miniProgram.getSession('code');

//手动实例化 MiniProgram
const miniProgram = new MiniProgram({
  miniProgram: {
    "appId": "mp_appid",
    "appSecret": "mp_app_secret",
  }
})
```

## 使用Stores
Store用来自定义存储token持久化(如文件，数据库等待)，实现自己的Store, 请查看[API](https://github.com/JasonBoy/wechat-jssdk/wiki/Store)  
自带 Store: `FileStore`, `MongoStore`，默认为`FileStore`, 存储到`wechat-info.json`文件.

## APIs
查看 [API wiki](https://github.com/JasonBoy/wechat-jssdk/wiki/API)

## Demo

在v3.1.0后，demo页面增加卡券和支付的用例测试，
Copy `demo/wechat-config-sample.js` 到 `demo/wechat-config.js`,  
然后在里面里面修改 `appId`, `appSecret`, 及其他的[配置](#wechat-config) 如支付的其他配置如果需要使用支付功能的话.

在`./demo/index.js`中设置你自己的`appId`, `appSecret`， 然后 `npm start` 或 `npm run dev`, 使用微信开发者工具测试。

## Buy me a coffee
如果您觉得这个项目对您有用，可以请我喝杯咖啡
![reward-me](https://raw.githubusercontent.com/JasonBoy/wechat-jssdk/master/assets/jason-wx-reward-code.png)

## LICENSE

MIT @ 2016-present [jason](http://blog.lovemily.me)
