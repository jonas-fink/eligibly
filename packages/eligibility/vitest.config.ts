import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: { environment: 'node' },
  resolve: {
    alias: {
      '@eligibility/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
});
