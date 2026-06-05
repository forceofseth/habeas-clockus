import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import devtools from 'solid-devtools/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `serve` (dev) keeps solid-devtools; `build` inlines everything into one
// portable, offline dist/index.html via vite-plugin-singlefile.
export default defineConfig(({ command }) => ({
  plugins:
    command === 'build'
      ? [solidPlugin(), viteSingleFile()]
      : [devtools(), solidPlugin()],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
}));
