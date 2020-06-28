import { WeChatConfig } from './config';
import Store from './store/Store';
import Card from './Card';

export interface WeChatOptions extends WeChatConfig {
  store?: Store;
  storeOptions?: Record<string, unknown>;
  clearCountInterval?: number;
  card?: boolean | Card;
}
