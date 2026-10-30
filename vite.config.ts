import { defineConfig } from 'vitest/config';

// Relative base: the built game works from GitHub Pages subpath or any static host.
export default defineConfig({
  base: './',
  build: { target: 'es2022', outDir: 'dist' },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
