import globals from 'globals';
import react from 'eslint-plugin-react';
export default [{
  files: ['src/**/*.{js,jsx}'],
  plugins: { react },
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser }, parserOptions: { ecmaFeatures: { jsx: true } } },
  rules: { 'no-undef': 'error', 'react/jsx-no-undef': 'error', 'react/jsx-uses-vars': 'error' },
}];
