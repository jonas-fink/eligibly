import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: { environment: 'node' },
  resolve: {
    alias: {
      '@eligibility/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@eligibility/eligibility': path.resolve(__dirname, '../../packages/eligibility/src/index.ts'),
    },
  },
});
