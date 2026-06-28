import { describe, it, expect } from 'vitest'
import { resolveExt } from '../src/server/ext.js'

describe('resolveExt', () => {
  it('prefers MIME type', () => {
    expect(resolveExt({ mime: 'image/png' })).toBe('png')
    expect(resolveExt({ mime: 'image/webp' })).toBe('webp')
  })
  it('normalizes jpeg to jpg (from mime and filename)', () => {
    expect(resolveExt({ mime: 'image/jpeg' })).toBe('jpg')
    expect(resolveExt({ filename: 'shot.jpeg' })).toBe('jpg')
  })
  it('falls back to filename extension when mime missing', () => {
    expect(resolveExt({ filename: 'photo.webp' })).toBe('webp')
  })
  it('defaults to png when nothing matches', () => {
    expect(resolveExt({})).toBe('png')
    expect(resolveExt({ mime: 'application/octet-stream', filename: 'x.heic' })).toBe('png')
  })
})
