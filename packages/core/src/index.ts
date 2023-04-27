import { add } from './utils.js';
export * from './utils.js';

function calc() {
  const temp = 1;
  // test lint fail
  // const obj = {};
  // obj.hasOwnProperty('key');
  return add(1, 2);
}

export type User = {
  name: string;
};

export { calc };
