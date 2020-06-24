const basicRules = {
  'prettier/prettier': 'off',
  eqeqeq: 'off',
  'no-prototype-builtins': 'off',
  'no-unused-vars': 'warn',
  'require-atomic-updates': 'warn',
};
module.exports = {
  root: true,
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
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
  rules: basicRules,
  overrides: [
    {
      files: ['lib/**/*.ts'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended',
      ],
      parser: '@typescript-eslint/parser',
      rules: {
        ...basicRules,
        '@typescript-eslint/camelcase': 'off',
      },
    },
  ],
};
