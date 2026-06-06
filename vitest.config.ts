import { defineConfig } from 'vitest/config';

// Pure-logic unit tests (no DOM/Solid) — the lib/* and model/* modules.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
