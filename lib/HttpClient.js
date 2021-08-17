'use strict';

const got = require('got');
const { URL } = require('url');
const tunnel = require('tunnel');

const gotDefaultOptions = {
  json: true,
  decompress: false,
};

class HttpClient {
  constructor(options) {
    options = options || {};
    const gotOptions = options.gotOptions || {};

    this.httpClient = null;
    this.usingCustomHttpClient = false;
    if (options.customHttpClient) {
      this.httpClient = options.customHttpClient;
      this.usingCustomHttpClient = true;
      this.options = options;
    } else {
      const agent = this._getAgent(options.httpProxy);
      this.options = Object.assign({ agent }, gotDefaultOptions, gotOptions);
      this.httpClient = got.extend(this.options);
    }
  }

  _getAgent(proxy) {
    if (!proxy) return;
    let agent;
    const parsedUrl = new URL(proxy);
    const tunnelOptions = {
      proxy: {
        host: parsedUrl.hostname,
        port: parsedUrl.port,
      },
    };
    agent =
      parsedUrl.protocol === 'https:'
        ? tunnel.httpsOverHttp(tunnelOptions)
        : tunnel.httpOverHttp(tunnelOptions);
    return agent;
  }

  /**
   * If do not want to use "got", you can override to "axios", "request" or something else
   * @param client
   */
  setCustomHttpClient(client) {
    this.httpClient = client;
    this.usingCustomHttpClient = true;
  }

  sendWechatRequest(url, options) {
    if (this.usingCustomHttpClient) {
      return this.httpClient(url, options);
    }
    const myOptions = Object.assign(this.options, options);
    return this.httpClient(url, myOptions)
      .then(response => {
        const body = response.body;
        if (body.hasOwnProperty('errcode') && body.errcode != 0) {
          return Promise.reject(body);
        }
        return Promise.resolve(body);
      })
      .catch(err => {
        debug(err);
        return Promise.reject(
          err.response && err.response.body ? err.response.body : err
        );
      });
  }

  sendWechatPaymentRequest(url, options) {
    if (this.usingCustomHttpClient) {
      return this.httpClient(url, options);
    }
    const myOptions = Object.assign(
      this.options,
      {
        json: false,
        method: 'POST',
      },
      options
    );
    return this.httpClient(url, myOptions)
      .then(response => {
        return Promise.resolve(response.body);
      })
      .catch(err => {
        debug(err);
        return Promise.reject(
          err.response && err.response.body ? err.response.body : err
        );
      });
  }
}

exports.HttpClient = HttpClient;
exports.httpClient = new HttpClient();
