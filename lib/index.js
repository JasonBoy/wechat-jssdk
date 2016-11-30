const JSSDK = require('./JSSDK');
const OAuth = require('./OAuth2');

class Wechat {
  /**
   * @constructor
   * @param config custom wechat configuration
   * @return {Wechat}
   */
  constructor (config) {
    if (!new.target) return new Wechat(config);
    this.jssdk = JSSDK(config);
    this.oauth = OAuth(config);
  }
}

module.exports = {
  initialize: config.setConfiguration,
  config: config,
  jssdk: require('./sdk'),
  oauth: require('./oauth')
};
