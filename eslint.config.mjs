import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    files: ['**/*.rules'],
    languageOptions: {
      parser: firebaseRulesPlugin.parser,
    },
    plugins: {
      'firebase-rules': firebaseRulesPlugin,
    },
    rules: {
      ...firebaseRulesPlugin.configs['flat/recommended'].rules,
    },
  },
];
