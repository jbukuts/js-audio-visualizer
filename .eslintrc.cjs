module.exports = {
  extends: ['prettier'],
  plugins: ['prettier'],
  rules: {
    quotes: ['error', 'single'],
    indent: ['error', 2],
    'prettier/prettier': ['error', { endOfLine: 'auto' }],
    'no-unused-vars': ['error', { destructuredArrayIgnorePattern: '^_' }],
    'one-var': [2, 'never'],
    'no-underscore-dangle': 'off',
    'import/no-extraneous-dependencies': ['off', { packageDir: [''] }]
  },
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2022
  },
  env: {
    browser: true,
    es6: true,
    node: true
  }
};
