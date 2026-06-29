import { defineNuxtModule, addPlugin, addServerHandler, createResolver } from '@nuxt/kit'
import type { DevAnnotationOptions } from '../core/types.js'

export interface ModuleOptions extends DevAnnotationOptions {
  /** Server-side save directory. Default '.dev-annotations'. */
  dir?: string
}

/** Minimal Nuxt instance shape used in setup — avoids depending on @nuxt/schema being installed. */
interface NuxtEnv {
  options: {
    dev: boolean
    runtimeConfig: { public: Record<string, unknown> } & Record<string, unknown>
  }
}

export default defineNuxtModule<ModuleOptions>({
  meta: { name: 'dev-annotate', configKey: 'devAnnotate' },
  defaults: {},
  setup(options: ModuleOptions, nuxt: NuxtEnv) {
    if (!nuxt.options.dev) return
    const resolver = createResolver(import.meta.url)

    // Expose client options via public runtime config
    nuxt.options.runtimeConfig.public = nuxt.options.runtimeConfig.public ?? {}
    ;(nuxt.options.runtimeConfig.public as Record<string, unknown>).devAnnotate = {
      endpoint: options.endpoint,
      colors: options.colors,
      sizes: options.sizes,
      shortcutKey: options.shortcutKey,
      zIndexBase: options.zIndexBase,
    }
    // Expose server-side dir via private runtime config
    ;(nuxt.options.runtimeConfig as Record<string, unknown>).devAnnotate = { dir: options.dir }

    addPlugin({ src: resolver.resolve('./runtime/plugin.client.js'), mode: 'client' })
    addServerHandler({
      route: options.endpoint ?? '/api/dev/save-annotation',
      method: 'post',
      handler: resolver.resolve('./runtime/server-route.js'),
    })
  },
})
