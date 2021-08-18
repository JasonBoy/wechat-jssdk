'use strict';

const isEmpty = require('lodash.isempty');
const { httpClient, HttpClient } = require('./HttpClient');

class BaseConfig {
  constructor(options) {
    options = options || {};
    const httpClientOptions = options.httpClientOptions || {};
    const gotOptions = httpClientOptions.gotOptions || {};
    this.httpClient = httpClient;
    if (httpClientOptions.customHttpClient) {
      this.httpClient = new HttpClient(httpClientOptions);
    } else {
      if (!isEmpty(gotOptions)) {
        this.httpClient = new HttpClient(httpClientOptions);
      }
    }
  }
}

module.exports = BaseConfig;
