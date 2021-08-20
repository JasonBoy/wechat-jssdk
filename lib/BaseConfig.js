'use strict';

const { HttpClient } = require('./HttpClient');

class BaseConfig {
  constructor(options) {
    options = options || {};
    this.httpClient = new HttpClient(options.httpClientOptions);
  }
}

module.exports = BaseConfig;
