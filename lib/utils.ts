import debugFnc from 'debug';
import { createHash, createHmac } from 'crypto';
import xml2js from 'xml2js';
import dateFormat from 'date-fns/format';
import { parse } from 'url';
import got, { ExtendOptions } from 'got';
import { WeChatPaymentAPIConfig } from './config';

export interface GlobalAccessTokenResult {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

const debug = debugFnc('wechat');

const DEFAULT_FORMAT = 'yyyyMMddHHmmss';

const defaultOptions = {
  // json: true,
};

//1h 59m, token is only valid within 2 hours
const REFRESH_INTERVAL = 1000 * 119 * 60;

/**
 * Generate digest hash based on the content
 * @param {string} content content to be digested
 * @param {string=} algorithm digest algorithm, default 'sha1'
 * @return {string}
 */
export function genHash(content: string, algorithm: string): string {
  const c = createHash(algorithm);
  c.update(content, 'utf8');
  return c.digest('hex');
}

/**
 * Generate SHA1 hash
 */
export function genSHA1(content: string): string {
  return genHash(content, 'sha1');
}

/**
 * Generate MD5 hash
 */
export function genMD5(content: string): string {
  return genHash(content, 'MD5');
}

export function genHmacSHA256(content: string, key: string): string {
  const hmac = createHmac('sha256', key);
  hmac.update(content, 'utf8');
  return hmac.digest('hex');
}

/**
 * Parse the object to query string without encoding based on the ascii key order
 * @param {object} args search params in object
 * @param {boolean} noLowerCase
 * @return {string}
 */
export function paramsToString(
  args: Record<string, unknown>,
  noLowerCase?: boolean,
): string {
  let keys = Object.keys(args);
  keys = keys.sort();
  const newArgs = {};
  keys.forEach((key) => {
    const temp = noLowerCase ? key : key.toLowerCase();
    newArgs[temp] = args[key];
  });

  let str = '';
  for (const k in newArgs) {
    /* istanbul ignore else  */
    if (newArgs.hasOwnProperty(k)) {
      str += '&' + k + '=' + newArgs[k];
    }
  }
  str = str.substr(1);
  return str;
}

/**
 * Send the request to wechat server
 * @param {string} url
 * @param {object} options custom request options
 */
export async function sendWechatRequest(
  url: string,
  options: ExtendOptions,
): Promise<Record<string, unknown>> {
  const myOptions = Object.assign({}, defaultOptions, options);
  try {
    const body: {
      errcode?: number;
    } = await got(url, myOptions)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      .json();
    if (body.hasOwnProperty('errcode') && body.errcode != 0) {
      return Promise.reject(body);
    }
    return body;
  } catch (err) {
    debug(err);
    return Promise.reject(
      err.response && err.response.body ? err.response.body : err,
    );
  }
}

/**
 * Send the payment request to wechat server
 * @param {string} url
 * @param {object} options custom request options
 */
export async function sendWechatPaymentRequest(
  url: string,
  options: ExtendOptions,
): Promise<string> {
  const myOptions = Object.assign(
    {},
    defaultOptions,
    {
      method: 'POST',
    },
    options,
  );
  try {
    const response = await got(url, myOptions);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return Promise.resolve(response.body);
  } catch (err) {
    debug(err);
    return Promise.reject(
      err.response && err.response.body ? err.response.body : err,
    );
  }
}

/**
 * Create nonce string
 * @return {string}
 */
export function nonceStr(): string {
  return Math.random().toString(36).substr(2, 15);
}

/**
 * Create timestamp string to seconds
 */
export function timestamp(): string {
  return Math.round(new Date().getTime() / 1000).toString();
}

/**
 * Check if date is expired
 * @param {Date|string} modifyDate
 * @param {number=} interval milliseconds custom expires in
 * @return {boolean}
 */
export function isExpired(
  modifyDate: Date | string,
  interval?: number,
): boolean {
  /* istanbul ignore else  */
  if (interval === undefined) interval = REFRESH_INTERVAL;
  return Date.now() - new Date(modifyDate).getTime() > interval;
}

/**
 * Get global access token from wechat server
 * @param {string} appId
 * @param {string} appSecret
 * @param {string} accessTokenUrl
 */
export async function getGlobalAccessToken(
  appId: string,
  appSecret: string,
  accessTokenUrl: string,
): Promise<GlobalAccessTokenResult> {
  const params = {
    grant_type: 'client_credential',
    appid: appId,
    secret: appSecret,
  };
  debug('getting new global token...');
  try {
    return ((await sendWechatRequest(accessTokenUrl, {
      searchParams: params,
    })) as unknown) as GlobalAccessTokenResult;
  } catch (reason) {
    debug('get global wechat access token failed!');
    return Promise.reject(reason);
  }
}

/**
 * Parse the xml data returned from wechat server
 * @return {Promise} result promise
 */
export async function parseXML(
  xmlData: string,
): Promise<Record<string, unknown>> {
  const parser = new xml2js.Parser({
    normalize: true,
    explicitRoot: false,
    explicitArray: false,
  });
  return new Promise(function (resolve, reject) {
    parser.parseString(xmlData, function (err, result) {
      /* istanbul ignore if  */
      if (err) {
        debug('result: ' + result);
        debug(err);
        reject(result);
        return;
      }
      resolve(result);
    });
  });
}

/**
 * Build xml data string from the JSON object
 * @param {object} objData - object to xml string
 * @return {Promise}
 */
export async function buildXML(
  objData: Record<string, unknown>,
): Promise<string> {
  const builder = new xml2js.Builder({
    rootName: 'xml',
    cdata: true,
    headless: true,
    allowSurrogateChars: true,
  });
  const xml = builder.buildObject(objData);
  return Promise.resolve(xml);
}

/**
 * Simple Date formatter
 * @param {(string|Date)=} date
 * @param {string=} format
 * @return {string}
 */
export function simpleDate(
  date: string | Date = new Date(),
  format = DEFAULT_FORMAT,
): string {
  /* istanbul ignore if  */
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  return dateFormat(date, format);
}

/**
 * Add "/sandboxnew" for payment apis to for testing
 * @param paymentUrls
 */
export function paymentUrlsWithSandBox(
  paymentUrls: WeChatPaymentAPIConfig,
): WeChatPaymentAPIConfig {
  const keys = Object.keys(paymentUrls);
  const newUrls = {} as WeChatPaymentAPIConfig;
  keys.forEach((urlKey) => {
    const paymentUrl = paymentUrls[urlKey];
    const obj = parse(paymentUrl);
    newUrls[urlKey] = [
      obj.protocol,
      '//',
      obj.host,
      '/sandboxnew',
      obj.pathname,
    ].join('');
  });
  return newUrls;
}

export function createBuffer(
  str: string,
  encoding: BufferEncoding = 'utf8',
): Buffer {
  return Buffer.from(str, encoding);
}

export function createBufferFromBase64(base64Str: string): Buffer {
  return createBuffer(base64Str, 'base64');
}
