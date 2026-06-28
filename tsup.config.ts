import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    'core/client': 'src/core/client.ts',
    'server/index': 'src/server/index.ts',
    'nuxt/module': 'src/nuxt/module.ts',
    'nuxt/runtime/plugin.client': 'src/nuxt/runtime/plugin.client.ts',
    'nuxt/runtime/server-route': 'src/nuxt/runtime/server-route.ts',
    'cli': 'src/cli/index.ts',
  },
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  dts: true,
  splitting: false,
  external: ['#imports'],
})
