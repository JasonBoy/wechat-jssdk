import debugFnc from 'debug';
import { promisify } from 'util';
import {
  writeFile as _writeFile,
  statSync,
  writeFileSync,
  readFileSync,
} from 'fs';
import { resolve } from 'path';
import Store from './Store';
import { getConfigFromCompareKeys, isBreakingConfigChange } from '../config';
import { StoreOptions } from './StoreOptions';

const debug = debugFnc('wechat-FileStore');
const writeFile = promisify(_writeFile);

export interface FileStoreOptions extends StoreOptions {
  fileStorePath?: string;
}

/**
 * Simple Store using json file
 */
class FileStore extends Store {
  fileStorePath: string;
  // store: Store;

  constructor(options: FileStoreOptions = {}, wechatConfig = {}) {
    super(options);

    this.fileStorePath = options.fileStorePath
      ? resolve(options.fileStorePath)
      : resolve(process.cwd(), 'wechat-info.json');

    this.initFileStore(options, wechatConfig);
  }

  initFileStore(options, wechatConfig) {
    debug('using FileStore[%s]...', this.fileStorePath);

    const emptyStore = Object.assign({}, this.store);
    let hasExistFile = true;
    const storeWechatConfig = getConfigFromCompareKeys(
      wechatConfig,
      options.compareConfigKeys,
    );

    try {
      statSync(this.fileStorePath);
    } catch (e) {
      //write the default empty store object to file
      emptyStore.wechatConfig = storeWechatConfig;
      hasExistFile = false;
      writeFileSync(this.fileStorePath, JSON.stringify(emptyStore, null, 2));
      debug('create wechat info file finished');
    } finally {
      const storeStr = readFileSync(this.fileStorePath, { encoding: 'utf8' });
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
          options.compareConfigKeys,
        )
      ) {
        this.store = emptyStore;
        this.store.wechatConfig = options;
        this.flush();
        debug('wechat config change, resetting wechat info...');
      }
    }
  }

  async flush() {
    const temp = Object.assign({}, this.store);
    if (temp.wechatConfig) {
      temp.wechatConfig.store = `${this.constructor.name}_${this.fileStorePath}`;
    }
    // console.log('this.store: ', temp);
    try {
      await writeFile(this.fileStorePath, JSON.stringify(temp, null, 2));
    } catch (err) {
      if (err) {
        debug('ERROR: export wechat info to file failed!');
        debug(err);
        return;
      }
      await super.flush();
      debug('export wechat info to file finished');
    }
  }

  destroy() {
    super.destroy();
    debug('fileStore destroyed!');
  }
}

export default FileStore;
