import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'data/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['packages/eligibility/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'express', message: 'packages/eligibility bleibt framework-frei.' },
            { name: 'mongoose', message: 'packages/eligibility kennt keine Datenbank.' },
          ],
          patterns: [
            { group: ['node:fs', 'node:fs/*', 'fs', 'fs/*'], message: 'Kein Dateisystem in der Fachlogik.' },
          ],
        },
      ],
    },
  },
);
