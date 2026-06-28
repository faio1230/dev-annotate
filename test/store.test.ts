import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, utimesSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { listAnnotations, latestAnnotation } from '../src/shared/store.js'

let dir: string
function touch(name: string, ageSeconds: number) {
  const p = join(dir, name)
  writeFileSync(p, name)
  const t = Date.now() / 1000 - ageSeconds
  utimesSync(p, t, t)
}
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'da-store-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

describe('listAnnotations', () => {
  it('returns annotated files newest-first, ignoring others', () => {
    touch('annotated-2026-01-01T00-00-00.png', 300)
    touch('annotated-2026-01-02T00-00-00.jpg', 100)
    touch('annotated-2026-01-03T00-00-00.webp', 10)
    touch('note.txt', 5)
    touch('screenshot.png', 5)
    const res = listAnnotations(dir)
    expect(res.map(f => f.name)).toEqual([
      'annotated-2026-01-03T00-00-00.webp',
      'annotated-2026-01-02T00-00-00.jpg',
      'annotated-2026-01-01T00-00-00.png',
    ])
  })
  it('honors limit', () => {
    touch('annotated-a.png', 30)
    touch('annotated-b.png', 20)
    touch('annotated-c.png', 10)
    expect(listAnnotations(dir, 2).map(f => f.name)).toEqual(['annotated-c.png', 'annotated-b.png'])
  })
  it('returns [] when dir is missing', () => {
    expect(listAnnotations(join(dir, 'nope'))).toEqual([])
  })
})

describe('latestAnnotation', () => {
  it('returns the newest, or undefined when empty', () => {
    expect(latestAnnotation(dir)).toBeUndefined()
    touch('annotated-old.png', 100)
    touch('annotated-new.png', 1)
    expect(latestAnnotation(dir)?.name).toBe('annotated-new.png')
  })
})
