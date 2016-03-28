var fs = require('fs')
  , path = require('path')
  , util = require('util')
  ;

//file to store the token info
//TODO may add more ways to store the info, like in DB
var wechatInfoPath = path.join(process.cwd(), 'wechat-info.json');

var cache = {
  globalToken: {
    count: 0
  }, //global token/ticket info
  urls: {} //token/ticket info for every url
};

try {
  fs.statSync(wechatInfoPath);
} catch (e) {
  fs.writeFileSync(wechatInfoPath, JSON.stringify(cache));
  console.log('creating wechat-info file finished');
} finally {
  cache = JSON.parse(fs.readFileSync(wechatInfoPath));
}

//store to file every 10min
var wechatInterval = setInterval(function () {
  flushWechatCache();
}, 1000 * 60 * 10);

process.on('exit', function () {
  clearInterval(wechatInterval);
  flushWechatCache();
});

module.exports = cache;

function flushWechatCache() {
  fs.writeFileSync(wechatInfoPath, JSON.stringify(cache));
  console.log('export wechat info to file finished');
}