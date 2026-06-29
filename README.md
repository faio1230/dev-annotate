# dev-annotate

Dev-only on-screen annotation tool. Scribble (pen / text / numbered pins)
directly on the live page in any browser — including mobile — take an **OS
screenshot**, and upload it so an AI agent (or you) can read it and fix the UI.

> **Why OS screenshots?** The real pixels (horizontal table scroll, WebGL
> backgrounds, `backdrop-filter`, …) can't be faithfully re-rendered by
> html2canvas-style DOM rasterization, and mobile browsers can't use
> `getDisplayMedia`. So the tool never re-composites: the human takes the OS
> screenshot and uploads the real bytes.

## Install

```
npm i -D dev-annotate
```

## Core (framework-agnostic)

```ts
import { initDevAnnotation } from 'dev-annotate'

// call this ONLY in development (you decide how to gate it)
if (import.meta.env?.DEV) {
  const destroy = initDevAnnotation({
    endpoint: '/api/dev/save-annotation', // where the upload is POSTed
    // colors, sizes, shortcutKey, zIndexBase are optional
  })
  // call destroy() on HMR/unmount to avoid duplicate UI
}
```

`initDevAnnotation(options?)` returns a `destroy()` function that removes all
injected DOM and listeners.

## Server (h3 / Nitro)

```ts
import { createSaveAnnotationHandler } from 'dev-annotate/server'
export default createSaveAnnotationHandler({ dir: '.dev-annotations' })
```

Or use the pure writer directly:

```ts
import { saveAnnotationBytes } from 'dev-annotate/server'
const { path, bytes } = saveAnnotationBytes(buffer, { mime: 'image/png' })
```

## Nuxt

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['dev-annotate/nuxt'],
  devAnnotate: { /* endpoint, colors, sizes, dir, ... */ },
})
```

The module only activates in dev; it registers the client plugin and a POST
handler at `endpoint` (default `/api/dev/save-annotation`).

## CLI — show annotations to your AI

```
npx dev-annotate latest [-n N] [--json] [--dir D]   # newest path(s)
npx dev-annotate list   [-n N] [--json] [--dir D]   # all, newest first
npx dev-annotate watch  [--json] [--dir D]          # print on new file
npx dev-annotate clean  [--keep N | --all] [--yes]  # tidy up
```

Drop `templates/agent-instructions.md` into your `CLAUDE.md` / `AGENTS.md` so
your agent knows the read → fix → verify → clean loop.

## Other frameworks (Vite / React / Next)

The core is plain DOM with zero deps. Gate it to dev and call
`initDevAnnotation()` once; for uploads, implement an endpoint that receives a
multipart `file` and writes the bytes (mirror `saveAnnotationBytes`). Adapters
for Vite/Next are not bundled yet — the two steps above are all you need.

## License

MIT
