'use strict';

const debug = require('debug')('wechat-FileStore');
const fs = require('fs');
const path = require('path');

const Store = require('./Store');
const {
  getConfigFromCompareKeys,
  isBreakingConfigChange,
} = require('../config');

/**
 * Simple Store using json file
 */
class FileStore extends Store {
  constructor(options = {}, wechatConfig = {}) {
    super(options);

    this.fileStorePath = options.fileStorePath
      ? path.resolve(options.fileStorePath)
      : path.resolve(process.cwd(), 'wechat-info.json');

    this.initFileStore(options, wechatConfig);
  }

  initFileStore(options, wechatConfig) {
    debug('using FileStore[%s]...', this.fileStorePath);

    const emptyStore = Object.assign({}, this.store);
    let hasExistFile = true;
    let storeWechatConfig = getConfigFromCompareKeys(
      wechatConfig,
      options.compareConfigKeys
    );

    try {
      fs.statSync(this.fileStorePath);
    } catch (e) {
      //write the default empty store object to file
      emptyStore.wechatConfig = storeWechatConfig;
      hasExistFile = false;
      fs.writeFileSync(this.fileStorePath, JSON.stringify(emptyStore, null, 2));
      debug('create wechat info file finished');
    } finally {
      const storeStr = fs.readFileSync(this.fileStorePath);
      /* istanbul ignore else */
      if (storeStr) {
        try {
          this.store = JSON.parse(storeStr);
        } catch (e) {
          /* istanbul ignore next */
          debug('wechat json file invalid! Will use empty store instead');
        }
      }
      /* istanbul ignore if */
      if (
        (hasExistFile && options.clearStore) ||
        isBreakingConfigChange(
          wechatConfig,
          this.store.wechatConfig,
          options.compareConfigKeys
        )
      ) {
        this.store = emptyStore;
        this.store.wechatConfig = options;
        this.flush();
        debug('wechat config change, resetting wechat info...');
      }
    }
  }

  flush() {
    const temp = Object.assign({}, this.store);
    if (temp.wechatConfig) {
      temp.wechatConfig.store = `${this.constructor.name}_${
        this.fileStorePath
      }`;
    }
    // console.log('this.store: ', temp);
    fs.writeFile(this.fileStorePath, JSON.stringify(temp, null, 2), err => {
      if (err) {
        debug('ERROR: export wechat info to file failed!');
        debug(err);
        return;
      }
      super.flush();
      debug('export wechat info to file finished');
    });
  }

  destroy() {
    super.destroy();
    debug('fileStore destroyed!');
  }
}

module.exports = FileStore;
