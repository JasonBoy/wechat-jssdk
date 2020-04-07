import { WeChatConfig } from './config';
import Store from './store/Store';

export interface WeChatOptions extends WeChatConfig {
  store?: Store;
  storeOptions?: object;
  clearCountInterval?: number;
}
