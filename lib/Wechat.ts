import debugFnc from 'debug';

import JSSDK from './JSSDK';
import OAuth from './OAuth';
import Card from './Card';
import Payment from './Payment';
import MiniProgram from './MiniProgram';
import Store from './store/Store';
import FileStore from './store/FileStore';

const debug = debugFnc('wechat');

class Wechat {
  jssdk: JSSDK;
  oauth: OAuth;
  card: Card;
  payment: Payment;
  store: Store;
  miniProgram: MiniProgram;
  /**
   * @constructor
   * @param options custom wechat configuration
   * @return {Wechat}
   */
  constructor(options) {
    options = options || {};
    //no custom store provided, using default FileStore
    if (!options.store || !(options.store instanceof Store)) {
      debug('Store not provided, using default FileStore...');
      options.store = new FileStore(options.storeOptions, options);
    }

    //create a JSSDK instance
    this.jssdk = new JSSDK(options);
    //create a OAuth instance
    this.oauth = new OAuth(options);
    /* istanbul ignore if  */
    if (options.card) {
      //create a Card instance
      this.card = new Card(options);
    }
    /* istanbul ignore if  */
    if (options.payment) {
      //create a Payment instance
      this.payment = new Payment(options);
    }
    /* istanbul ignore if  */
    if (options.miniProgram) {
      //create a MiniProgram instance
      this.miniProgram = new MiniProgram(options);
    }

    this.store = options.store;
  }
}

export default Wechat;
