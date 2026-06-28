import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    'core/client': 'src/core/client.ts',
    'server/index': 'src/server/index.ts',
    'nuxt/module': 'src/nuxt/module.ts',
    'cli': 'src/cli/index.ts',
  },
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  dts: false,
  splitting: false,
  banner: ({ format }) => (format === 'esm' ? {} : {}),
  esbuildOptions(options) {
    options.banner = { js: '' }
  },
})
