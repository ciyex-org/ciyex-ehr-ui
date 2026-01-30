import js from "@eslint/js";
import next from "eslint-config-next";

export default [
  js.configs.recommended,
  ...next,
  {
    languageOptions: {
      globals: {
        React: 'readonly',
        JSX: 'readonly',
        RequestInit: 'readonly',
        HeadersInit: 'readonly',
        RequestInfo: 'readonly',
        RequestCache: 'readonly',
      },
    },
    rules: {
      // Re-enabled rules - previously disabled, now enforced
      'no-unused-vars': 'warn', // Warn on unused variables
      'no-empty': 'warn', // Warn on empty blocks
      'react-hooks/rules-of-hooks': 'error', // Error on hook rule violations
      'react-hooks/exhaustive-deps': 'warn', // Warn on missing deps
      '@next/next/no-img-element': 'warn', // Prefer next/image

      // Still disabled - require larger refactor
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/immutability': 'off',
      
      // Code quality rules
      'no-dupe-else-if': 'error', // Error on duplicate else-if conditions
      'no-useless-escape': 'warn', // Warn on unnecessary escapes
      'no-duplicate-case': 'error', // Error on duplicate switch cases
      'import/no-anonymous-default-export': 'off', // Allow anonymous exports
    },
  },
];
