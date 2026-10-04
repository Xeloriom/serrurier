import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['vendor/**', 'playwright-report/**', 'test-results/**'],
  },
  js.configs.recommended,
  {
    files: ['main.js', 'tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        Alpine: 'readonly',
        Lenis: 'readonly',
      },
    },
  },
  {
    files: ['playwright.config.js', 'eslint.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
];
