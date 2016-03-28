var express = require('express');
var http = require("http");
var swig = require('swig');
var wx = require('../lib');
var path = require("path");
wx.initialize({
  "wechatToken": "6mwdIm9p@Wg7$Oup",
  "appId": "wxfc9c5237ebf480aa",
  "appSecret": "2038576336804a90992b8dbe46cd5948"
});

var app = express();
swig.setDefaults({
  cache: false
});

app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname));

app.get('/', function (req, res) {
  res.render('index');
});

app.get('/api/wechat', function (req, res) {
  if(wx.jssdk.verifySignature(req.query)) {
    res.send(req.query.echostr);
    return;
  }
  res.send("error");
});

app.get('/create-signature', function(req, res) {
  console.log(req.query);
  wx.jssdk.createNewSignature(req, res, req.query);
});

app.get('/get-signature', function(req, res) {
  res.json(wx.jssdk.getSignatureByURL(req.query.url)); //pass the url or do whatever you prefer
});


var server = http.createServer(app);
server.listen(3000);