import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/jobs/index.ts'],
  outDir: 'dist/jobs',
  format: 'cjs',
  target: 'node20',
  clean: true,
  sourcemap: true,
  minify: false,
  splitting: false,
  bundle: true,
})
