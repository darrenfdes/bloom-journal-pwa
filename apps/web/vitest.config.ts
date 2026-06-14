import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@\/(.*)$/, replacement: `${path.resolve(__dirname, '.')}/$1` },
      { find: '@bloom/core/scene/types', replacement: path.resolve(__dirname, '../../packages/core/src/scene/types.ts') },
      { find: '@bloom/core/scene', replacement: path.resolve(__dirname, '../../packages/core/src/scene/index.ts') },
      {
        find: /^@bloom\/core\/(.+)$/,
        replacement: `${path.resolve(__dirname, '../../packages/core/src')}/$1`,
      },
      { find: '@bloom/core', replacement: path.resolve(__dirname, '../../packages/core/src/index.ts') },
    ],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
  },
});
