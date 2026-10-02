import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom' },
  resolve: {
    alias: {
      '@eligibility/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});
