const fs = require('fs');
const path = require('path');

const Wechat = require('../lib');
// const MongoStore = Wechat.MongoStore;
const FileStore = Wechat.FileStore;

const DOMAIN = 'http://your.domain.com';

module.exports = {
  //=====a service account test=====
  domain: DOMAIN,
  wechatToken: '',
  appId: '',
  appSecret: '',
  wechatRedirectUrl: `${DOMAIN}/oauth`,
  // store: new MongoStore({limit: 5}),
  store: new FileStore({ interval: 1000 * 60 * 3 }),
  card: true,
  payment: true,
  merchantId: '',
  paymentSandBox: true, //dev env
  paymentKey: '',
  // paymentSandBoxKey: '',
  paymentCertificatePfx: fs.readFileSync(
    path.join(process.cwd(), 'cert/apiclient_cert.p12')
  ),
  paymentNotifyUrl: `${DOMAIN}/api/wechat/payment/`,
  // add custom http proxy, or custom http lib
  httpClientOptions: {
    // // example:
    // // customHttpClient: require('axios'),
    // customHttpClient: function (url, options) {
    //   return require('axios')(url, options)
    // },
    // gotOptions: {
    //   decompress: false,
    // },
    // // assume you are using charles proxy, ignored if you are using customHttpClient
    // httpProxy: 'https://127.0.0.1:8888',
  },
};
