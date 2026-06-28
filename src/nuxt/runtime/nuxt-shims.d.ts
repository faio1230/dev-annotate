declare module '#imports' {
  export function defineNuxtPlugin<T>(fn: T): T
  export function useRuntimeConfig(): { public: Record<string, unknown> } & Record<string, unknown>
}

interface ImportMeta {
  /** Vite HMR context — available during development. */
  hot?: {
    dispose: (cb: () => void) => void
  }
}
