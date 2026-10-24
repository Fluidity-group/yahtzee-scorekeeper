import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: { alias: { '#dice-panel': resolve('src/dice/connection-ui.js') } },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js', 'local-evaluation/**/*.test.js'],
  },
});
