'use strict';

const express = require('express');
const http = require("http");
const swig = require('swig');
const Wechat = require('../lib');
const path = require("path");
const fs = require("fs");
const debug = require('debug')('wechat');
const bodyParser = require('body-parser');

const cookieParser = require('cookie-parser');
const session = require('express-session');

const Order = require('./Order');

const MongoStore = Wechat.MongoStore;
const FileStore = Wechat.FileStore;
const Card = Wechat.Card;

const pfxPath = path.join(process.cwd(), 'cert/apiclient_cert.p12');
// const certPath = path.join(process.cwd(), 'cert/apiclient_cert.pem');
// const keyPath = path.join(process.cwd(), 'cert/apiclient_key.pem');

const wx = new Wechat({
  wechatToken: "6mwdIm9p@Wg7$Oup",
  appId: "wxfc9c5237ebf480aa",
  appSecret: "2038576336804a90992b8dbe46cd5948",
  //=====a service account test=====
  // wechatToken: "",
  // appId: "",
  // appSecret: "",
  // wechatRedirectUrl: "",
  // // store: new MongoStore({limit: 5}),
  // store: new FileStore({interval: 1000 * 60 * 3}),
  // card: true,
  // payment: true,
  // merchantId: '',
  // paymentSandBox: true,
  // paymentKey: '', //API SIGN KEY
  // paymentSandBoxKey: '',
  // paymentCertificatePfx: fs.readFileSync(pfxPath),
  // // paymentCertificateCert: fs.readFileSync(certPath),
  // // paymentCertificateKey: fs.readFileSync(keyPath),
  // paymentNotifyUrl: "",
});

const order = new Order({payment: wx.payment});

const app = express();
swig.setDefaults({
  cache: false,
});

app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.enable('trust proxy');
app.set('views', path.join(__dirname));

app.use(cookieParser());
app.use(session({name: "sid", secret: 'wechat-app', saveUninitialized: true, resave: true}));

app.get('/', function (req, res) {
  //also you can generate one at runtime:
  const implicitOAuthUrl = wx.oauth.generateOAuthUrl("http://beautytest.yjyyun.com/implicit-oauth", "snsapi_base");
  res.render('index', {
    oauthUrl: wx.oauth.snsUserInfoUrl,
    implicitOAuth: implicitOAuthUrl,
  });
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
      console.log('userProfile:', userProfile);
      //set openid to session to use in following request
      req.session.openid = userProfile.openid;
      console.log(req.session.openid);
      res.render("oauth", {
        wechatInfo: JSON.stringify(userProfile)
      });
    });
});

app.get('/implicit-oauth', function (req, res) {
  const redirect = req.query.from;
  wx.oauth.getUserBaseInfo(req.query.code)
    .then(function (tokenInfo) {
      console.log('implicit oauth: ', tokenInfo);
      // console.log('implicit oauth: ', JSON.stringify(tokenInfo));
      req.session.openid = tokenInfo.openid;
      if(redirect) {
        res.redirect(redirect);
        return;
      }
      res.render("oauth", {
        wechatInfo: JSON.stringify(tokenInfo, null, 2)
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

app.get('/choose-card', function (req, res) {
  const qs = req.query;
  wx.card.getCardSignature(qs.shopId, qs.cardType, qs.cardId)
    .then(sigInfo => {
      res.json(sigInfo);
    })
    .catch(reason => {
      res.json(reason);
    })
  ;
});

app.get('/get-card-ext', function (req, res) {
  const qs = req.query;
  wx.card.getCardExt(qs.cardId, '', '', '', 'wechat-jssdk')
    .then(sigInfo => {
      res.json({data: sigInfo});
    })
    .catch(reason => {
      res.json(reason);
    })
  ;
});

app.get('/decode-card-code', function (req, res) {
  wx.card.decodeCardCode(req.query.encryptCode)
    .then(data => {
      res.json(data);
    })
    .catch(data => {
      res.json(data);
    })
});

app.get('/client.js', function (req, res) {
  res.sendFile(path.join(__dirname, '../dist/client.js'));
});

app.get('/create-order', function (req, res) {
  const openid = req.session.openid;
  console.log('req.session.openid:', openid);

  order.createOrder({
      openid: req.session.openid || 'oy5F1wQTfhx4-V3L5TcUn5V9v2Lo',
      spbill_create_ip: '104.247.128.2', //req.ip,
    })
    .then(data => {
      console.log(data.orderId);
      req.session.orderId = data.orderId;
      res.json(data.chooseWXPay);
    })
    .catch(err => {
      res.json(err);
    })
});

app.get('/query-order', function (req, res) {
  const orderId = req.session.orderId;

  order.queryOrder(orderId)
    .then(data => {
      res.json(data);
    })
    .catch(err => {
      res.json(err);
    })
});

//demo: unified order pay result notify_url goes here
app.post('/pay-result-notify', bodyParser.text(), function (req, res) {
  wx.payment.parseNotifyData(req.body)
    .then(data => {
      const sign = data.sign;
      data.sign = undefined;
      const genSignData = wx.payment.generateSignature(data, data.sign_type);
      if(sign === genSignData.sign) {
        order.updateNotifyResult(data);
        //sign check and send back
        wx.payment.replyData(true)
          .then(ret => {
            res.send(ret);
          });
        return;
      }
      return Promise.reject(new Error('notify sign not matched!'));
    })
    .catch(err => {
      console.error(err);
      wx.payment.replyData(false)
        .then(ret => {
          res.send(ret);
        })
    })
});
//process refund notify result
app.post('/refund-result-notify', bodyParser.text(), function (req, res) {
  wx.payment.decryptRefundNotifyResult(req.body)
    .then(result => {
      const parsedXMLData = result.parsedXMLData;
      const decryptedReqInfoData = result.decryptedData;
      order.updateNotifyRefundResult(Object.assign(parsedXMLData, decryptedReqInfoData));

      wx.payment.replyData(true)
        .then(ret => {
          res.send(ret);
        });
    })
    .catch(err => {
      console.error(err);
      wx.payment.replyData(false)
        .then(ret => {
          res.send(ret);
        });
    })
  ;
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
