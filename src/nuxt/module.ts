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

    // Expose client options via public runtime config.
    // Only include keys that are actually defined: Nuxt serializes `undefined`
    // public runtime-config values to empty strings, which would slip past the
    // client's `?? DEFAULTS` fallback and break `colors.map` / `sizes.map`.
    const publicConfig: Record<string, unknown> = {}
    if (options.endpoint !== undefined) publicConfig.endpoint = options.endpoint
    if (options.colors !== undefined) publicConfig.colors = options.colors
    if (options.sizes !== undefined) publicConfig.sizes = options.sizes
    if (options.shortcutKey !== undefined) publicConfig.shortcutKey = options.shortcutKey
    if (options.zIndexBase !== undefined) publicConfig.zIndexBase = options.zIndexBase
    nuxt.options.runtimeConfig.public = nuxt.options.runtimeConfig.public ?? {}
    ;(nuxt.options.runtimeConfig.public as Record<string, unknown>).devAnnotate = publicConfig
    // Expose server-side dir via private runtime config (omit when undefined so
    // the server handler's `?? DEFAULT_DIR` fallback applies instead of "").
    ;(nuxt.options.runtimeConfig as Record<string, unknown>).devAnnotate =
      options.dir !== undefined ? { dir: options.dir } : {}

    addPlugin({ src: resolver.resolve('./runtime/plugin.client.js'), mode: 'client' })
    addServerHandler({
      route: options.endpoint ?? '/api/dev/save-annotation',
      method: 'post',
      handler: resolver.resolve('./runtime/server-route.js'),
    })
  },
})
