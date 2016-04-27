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

app.get('/get-signature', function(req, res) {
  console.log(req.query);
  wx.jssdk.getSignatureByURL(req.query.url, function(data) {
    res.json(data);
  });
});

app.get('/client.js', function (req, res) {
  res.sendFile(path.join(__dirname, '../client.js'));
});

var server = http.createServer(app);
//should use like nginx to proxy to the request to 3000, the signature domain must be on 80 PORT.
server.listen(3000);