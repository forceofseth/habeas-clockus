import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

// Pure-logic tests (lib/*, model/*) plus Solid component "click" smoke tests
// (*.test.tsx) rendered into jsdom. The Solid plugin + browser/development
// resolve conditions are required for the reactive runtime to work under test.
export default defineConfig({
  plugins: [solid()],
  resolve: { conditions: ['development', 'browser'] },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    server: { deps: { inline: [/solid-js/, /@solidjs\/testing-library/] } },
  },
});
