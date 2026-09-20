const globals = require('globals');
const pluginJs = require('@eslint/js');

module.exports = [
  pluginJs.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node, // Habilita require, module, __dirname, etc.
        ...globals.jest, // Habilita describe, test, expect para pruebas
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: 'next|^_' }],
    },
  },
];