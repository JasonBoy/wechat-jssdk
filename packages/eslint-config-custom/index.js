module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    // 'next',
    'turbo',
    // 'prettier',
    'plugin:prettier/recommended',
  ],
  // env: {
  //   browser: true,
  //   node: true,
  // },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    // '@next/next/no-html-link-for-pages': 'off',
  },
  parserOptions: {
    // babelOptions: {
    //   presets: [require.resolve("next/babel")],
    // },
  },
  ignorePatterns: ['dist', 'node_modules', 'eslint-config-custom'],
};
