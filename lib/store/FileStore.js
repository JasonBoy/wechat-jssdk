const debug = require('debug')('wechat');
const fs = require('fs');
const path = require('path');

const Store = require('./Store');

class FileStore extends Store {

  constructor (options = {}) {
    super();
    
    this.fileStorePath = options.fileStorePath
      ? path.resolve(options.fileStorePath)
      : path.resolve(process.cwd(), 'wechat-info.json')
      ;
    
    try {
      fs.statSync(this.fileStorePath);
    } catch (e) {
      //write the default empty store object to file
      fs.writeFileSync(this.fileStorePath, JSON.stringify(this.store));
      debug('creating wechat-info file finished');
    } finally {
      this.store = JSON.parse(fs.readFileSync(this.fileStorePath));
    }

    //store to file every 10mins
    const wechatInterval = setInterval(() => this.flushStore(), 1000 * 60 * 10);

    process.on('exit', () => {
      clearInterval(wechatInterval);
      this.flushStore();
    });

  }

  flushStore () {
    fs.writeFileSync(this.fileStorePath, JSON.stringify(this.store));
    debug('export wechat info to file finished');
  }

}

module.exports = FileStore;