const debug = require('debug')('wechat');
const fs = require('fs');
const path = require('path');

const Store = require('./Store');

/**
 * Simple Store using file
 */
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
      debug('create wechat info file finished');
    } finally {
      const storeStr = fs.readFileSync(this.fileStorePath);
      if(!storeStr) {
        this.store = JSON.parse(storeStr);
      }
    }

    //store to file every 10 minutes
    this.wechatInterval = setInterval(() => this.flushStore(), 1000 * 60 * 10);

  }

  flushStore () {
    fs.writeFile(this.fileStorePath, JSON.stringify(this.store), (err) => {
      if(err) {
        debug('ERROR: export wechat info to file failed!');
        debug(err);
        return;
      }
      super.flushStore();
      debug('export wechat info to file finished');
    });
  }

  destroy () {
    clearInterval(this.wechatInterval);
    this.fileStorePath = null;
    super.destroy();
    debug('fileStore destroyed!');
  }

}

module.exports = FileStore;