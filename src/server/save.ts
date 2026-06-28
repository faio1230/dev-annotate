import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { resolveExt } from './ext.js'

export interface SaveAnnotationOptions {
  dir?: string
  filename?: string
  mime?: string
}
export interface SaveAnnotationResult {
  path: string
  bytes: number
}

export const DEFAULT_DIR = '.playwright-mcp/design-review'

export function saveAnnotationBytes(
  data: Uint8Array,
  opts: SaveAnnotationOptions = {},
): SaveAnnotationResult {
  const dir = resolve(process.cwd(), opts.dir ?? DEFAULT_DIR)
  mkdirSync(dir, { recursive: true })
  const ext = resolveExt({ mime: opts.mime, filename: opts.filename })
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const fname = `annotated-${ts}.${ext}`
  writeFileSync(resolve(dir, fname), data)
  return { path: fname, bytes: data.length }
}
