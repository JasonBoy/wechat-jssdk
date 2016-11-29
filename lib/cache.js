const debug = require('debug')('wechat');
const fs = require('fs');
const path = require('path');

//file to store the token info
//TODO may add more ways to store the info, like in DB
const WECHAT_INFO_PATH = path.join(process.cwd(), 'wechat-info.json');

let cache = {
  globalToken: {
    count: 0
  }, //global token/ticket info
  urls: {} //token/ticket info for every url
};

try {
  fs.statSync(WECHAT_INFO_PATH);
} catch (e) {
  fs.writeFileSync(WECHAT_INFO_PATH, JSON.stringify(cache));
  debug('creating wechat-info file finished');
} finally {
  cache = JSON.parse(fs.readFileSync(WECHAT_INFO_PATH));
}

//store to file every 10min
const wechatInterval = setInterval(() => flushWechatCache(), 1000 * 60 * 10);

process.on('exit', () => {
  clearInterval(wechatInterval);
  flushWechatCache();
});

module.exports = cache;

function flushWechatCache() {
  fs.writeFileSync(WECHAT_INFO_PATH, JSON.stringify(cache));
  debug('export wechat info to file finished');
}