const express = require('express');
const http = require("http");
const swig = require('swig');
const Wechat = require('../lib');
const path = require("path");

const wx = new Wechat({
  "wechatToken": "6mwdIm9p@Wg7$Oup",
  "appId": "wxfc9c5237ebf480aa",
  "appSecret": "2038576336804a90992b8dbe46cd5948",
  "wechatRedirectUrl": "http://127.0.0.1/oauth",
});

const app = express();
swig.setDefaults({
  cache: false,
});

app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname));

app.get('/', function (req, res) {
  //also you can generate one at runtime:
  //const oauthUrl = wx.oauth.generateOauthUrl(customRedirectUrl, isBaseInfo);
  res.render('index', {oauthUrl: wx.oauth.snsUserInfoUrl});
});

app.get('/api/wechat', function (req, res) {
  if(wx.jssdk.verifySignature(req.query)) {
    res.send(req.query.echostr);
    return;
  }
  res.send("error");
});

app.get('/get-signature', function(req, res) {
  console.log(req.query);
  wx.jssdk.getSignatureByURL(req.query.url).then((data) => {
    console.log('OK', data);
    res.json(data);
  }, (reason) => {
    console.error(reason);
    res.json(reason);
  });
});

/**
 * @see wechatRedirectUrl in Wechat config
 */
app.get('/oauth', function (req, res) {
  wx.oauth.getUserInfo(req.query.code)
    .then(function(userProfile) {
      console.log(userProfile);
      res.render("oauth", {
        wechatInfo: JSON.stringify(userProfile)
      });
    });
});

app.get('/client.js', function (req, res) {
  res.sendFile(path.join(__dirname, '../client.js'));
});

const server = http.createServer(app);
//should use like nginx to proxy the request to 3000, the signature domain must be on PORT 80.
server.listen(process.env.PORT || 3000);