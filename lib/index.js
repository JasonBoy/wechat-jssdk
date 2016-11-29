const config = require('./config');

module.exports = {
  initialize: config.setConfiguration,
  config: config,
  jssdk: require('./sdk'),
  oauth: require('./oauth')
};
