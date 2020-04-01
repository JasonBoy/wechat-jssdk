module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2018,
    // sourceType: 'module',
  },
  env: {
    es6: true,
    browser: true,
    node: true,
    jest: true,
  },
  plugins: [],
  rules: {
    'prettier/prettier': 'off',
    eqeqeq: 'off',
    'no-prototype-builtins': 'off',
    'no-unused-vars': 'warn',
    'require-atomic-updates': 'warn',
  },
};
