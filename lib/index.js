const JSSDK = require('./JSSDK');
const OAuth = require('./OAuth');

class Wechat {
  /**
   * @constructor
   * @param config custom wechat configuration
   * @return {Wechat}
   */
  constructor (config) {
    this.jssdk = new JSSDK(config); //create a JSSDK instance
    this.oauth = new OAuth(config); //create a OAuth instance
  }

  static get JSSDK () {
    return JSSDK;
  }

  static get OAuth () {
    return OAuth;
  }
}

module.exports = Wechat;
