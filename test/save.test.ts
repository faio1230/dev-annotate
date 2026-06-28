import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { saveAnnotationBytes } from '../src/server/save.js'

let dir: string
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'da-save-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

describe('saveAnnotationBytes', () => {
  it('writes bytes with inferred extension and returns filename + size', () => {
    const data = new Uint8Array([1, 2, 3, 4])
    const res = saveAnnotationBytes(data, { dir, mime: 'image/png' })
    expect(res.bytes).toBe(4)
    expect(res.path).toMatch(/^annotated-.*\.png$/)
    const files = readdirSync(dir)
    expect(files).toContain(res.path)
    expect(readFileSync(join(dir, res.path))).toEqual(Buffer.from(data))
  })

  it('creates the directory if missing', () => {
    const nested = join(dir, 'a', 'b')
    const res = saveAnnotationBytes(new Uint8Array([9]), { dir: nested, filename: 'p.jpeg' })
    expect(res.path).toMatch(/\.jpg$/)
    expect(readdirSync(nested)).toContain(res.path)
  })
})
