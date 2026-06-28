import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const readMultipartFormData = vi.fn()
vi.mock('h3', () => ({
  defineEventHandler: (fn: unknown) => fn,
  createError: (e: { statusCode: number; statusMessage: string }) => Object.assign(new Error(e.statusMessage), e),
  readMultipartFormData: (...args: unknown[]) => readMultipartFormData(...args),
}))

let dir: string
// NOTE: vi.stubGlobal('import', undefined) was removed — import.meta cannot be stubbed
// that way and it may throw or be a no-op. The dev gate falls back to NODE_ENV when
// import.meta.dev is undefined (Vitest/Node environment), controlled via vi.stubEnv.
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'da-h3-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }); readMultipartFormData.mockReset() })

async function load() {
  vi.resetModules()
  return await import('../src/server/h3.js')
}

describe('createSaveAnnotationHandler', () => {
  it('rejects when not dev', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { createSaveAnnotationHandler } = await load()
    const handler = createSaveAnnotationHandler({ dir }) as (e: unknown) => Promise<unknown>
    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 })
  })

  it('saves uploaded file in dev', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    readMultipartFormData.mockResolvedValue([
      { name: 'file', filename: 'shot.png', type: 'image/png', data: Buffer.from([1, 2, 3]) },
    ])
    const { createSaveAnnotationHandler } = await load()
    const handler = createSaveAnnotationHandler({ dir }) as (e: unknown) => Promise<{ ok: boolean; bytes: number }>
    const res = await handler({})
    expect(res.ok).toBe(true)
    expect(res.bytes).toBe(3)
    expect(readdirSync(dir).some(f => /^annotated-.*\.png$/.test(f))).toBe(true)
  })

  it('400 when no file part', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    readMultipartFormData.mockResolvedValue([])
    const { createSaveAnnotationHandler } = await load()
    const handler = createSaveAnnotationHandler({ dir }) as (e: unknown) => Promise<unknown>
    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
  })
})
