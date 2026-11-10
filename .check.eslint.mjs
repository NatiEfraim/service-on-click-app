// temporary checker used during the refactor: undefined names, unused imports, hooks rules
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
export default [{
  files: ['src/**/*.{js,jsx}'],
  plugins: { react, 'react-hooks': hooks },
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } }, globals: { ...globals.browser, ...globals.node } },
  settings: { react: { version: 'detect' } },
  rules: { 'no-undef': 'error', 'react/jsx-no-undef': 'error', 'react/jsx-uses-vars': 'error', 'react/jsx-uses-react': 'off', 'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }], 'react-hooks/rules-of-hooks': 'error' },
}];
