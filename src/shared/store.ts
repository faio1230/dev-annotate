import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

export interface AnnotationFile {
  path: string
  name: string
  bytes: number
  mtimeMs: number
}

const ANNOTATED_RE = /^annotated-.*\.(png|jpe?g|webp)$/i

export function listAnnotations(dir: string, limit?: number): AnnotationFile[] {
  if (!existsSync(dir)) return []
  const files = readdirSync(dir)
    .filter(name => ANNOTATED_RE.test(name))
    .map((name): AnnotationFile => {
      const path = join(dir, name)
      const st = statSync(path)
      return { path, name, bytes: st.size, mtimeMs: st.mtimeMs }
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
  return typeof limit === 'number' ? files.slice(0, limit) : files
}

export function latestAnnotation(dir: string): AnnotationFile | undefined {
  return listAnnotations(dir, 1)[0]
}
