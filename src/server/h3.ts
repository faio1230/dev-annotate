import { defineEventHandler, createError, readMultipartFormData } from 'h3'
import type { EventHandler } from 'h3'
import { saveAnnotationBytes } from './save.js'

export interface SaveHandlerOptions {
  dir?: string
}

function isDev(): boolean {
  // Nitro provides import.meta.dev; fall back to NODE_ENV elsewhere.
  const meta = import.meta as unknown as { dev?: boolean }
  return meta.dev ?? process.env.NODE_ENV !== 'production'
}

export function createSaveAnnotationHandler(opts: SaveHandlerOptions = {}): EventHandler {
  return defineEventHandler(async (event) => {
    if (!isDev()) {
      throw createError({ statusCode: 403, statusMessage: 'Dev only' })
    }
    const parts = await readMultipartFormData(event)
    const file = parts?.find(p => p.name === 'file' && p.filename && p.data?.length)
    if (!file) {
      throw createError({ statusCode: 400, statusMessage: 'no file uploaded' })
    }
    const result = saveAnnotationBytes(file.data, {
      dir: opts.dir,
      filename: file.filename,
      mime: file.type,
    })
    return { ok: true, ...result }
  })
}
