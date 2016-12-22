'use strict';

const express = require('express');
const http = require("http");
const swig = require('swig');
const Wechat = require('../lib');
const path = require("path");
const debug = require('debug')('wechat');

const cookieParser = require('cookie-parser');
const session = require('express-session');

const MongoStore = Wechat.MongoStore;
const FileStore = Wechat.FileStore;

const wx = new Wechat({
  "wechatToken": "6mwdIm9p@Wg7$Oup",
  "appId": "wxfc9c5237ebf480aa",
  "appSecret": "2038576336804a90992b8dbe46cd5948",
  "wechatRedirectUrl": "http://127.0.0.1/oauth",
  // store: new MongoStore({limit: 5}),
  store: new FileStore({interval: 1000 * 60 * 3}),
});

const app = express();
swig.setDefaults({
  cache: false,
});

app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname));

app.use(cookieParser());
app.use(session({name: "sid", secret: 'wechat-app', saveUninitialized: true, resave: true}));


app.get('/', function (req, res) {
  //also you can generate one at runtime:
  //const oauthUrl = wx.oauth.generateOAuthUrl(customRedirectUrl, scope, state);
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
  wx.jssdk.getSignature(req.query.url).then((data) => {
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
  //use default openid as the key
  const key = req.session.openid;

  //use custom key for oauth token store
  // const key = req.sessionID;
  // console.log('oauth sessionID: %s', key);
  wx.oauth.getUserInfo(req.query.code, key)
    .then(function(userProfile) {
      console.log(userProfile);
      //set openid to session to use in following request
      req.session.openid = userProfile.openid;
      res.render("oauth", {
        wechatInfo: JSON.stringify(userProfile)
      });
    });
});

app.get('/oauth-cache', function (req, res) {
  const key = req.session.openid;
  console.log('openid: ', key);

  // const sid = req.sessionID;
  // console.log('sessionID: %s', sid);

  //get user info without code, but with cached access token,
  //if cached token is expired, or cannot refresh the token,
  //it will redirect to the "/oauth" router above in catch handler to get new code
  wx.oauth.getUserInfo(null, key)
    .then(function(userProfile) {
      console.log(userProfile);
      res.render("oauth", {
        wechatInfo: JSON.stringify(userProfile)
      });
    })
    .catch(() => {
      //need to get new code
      res.redirect(wx.oauth.snsUserInfoUrl);
    });
});

app.get('/client.js', function (req, res) {
  res.sendFile(path.join(__dirname, '../dist/client.min.js'));
});

const server = http.createServer(app);
const port = process.env.PORT || 3000;
//should use like nginx to proxy the request to 3000, the signature domain must be on PORT 80.
server.listen(port);
server.on('listening', function() {
  debug('Express listening on port %d', port);
});

process.on('exit', function () {
  wx.store.flush();
});
