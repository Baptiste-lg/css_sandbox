import globals from 'globals';

export default [
  {
    files: ['**/*.js'],
    ignores: ['lzstring.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
      'eqeqeq': 'warn',
      'no-console': 'off',
    },
  },
];
