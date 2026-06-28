import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, utimesSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runCli } from '../src/cli/index.js'

let dir: string
let out: string[]
let err: string[]
function touch(name: string, ageSeconds: number) {
  const p = join(dir, name)
  writeFileSync(p, name)
  const t = Date.now() / 1000 - ageSeconds
  utimesSync(p, t, t)
}
function io() { return { cwd: dir, log: (s: string) => out.push(s), error: (s: string) => err.push(s) } }
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'da-cli-')); out = []; err = [] })
afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('runCli', () => {
  it('latest prints the newest annotated path', () => {
    touch('annotated-old.png', 100)
    touch('annotated-new.png', 1)
    const code = runCli(['latest'], io())
    expect(code).toBe(0)
    expect(out.join('\n')).toContain('annotated-new.png')
    expect(out.join('\n')).not.toContain('annotated-old.png')
  })

  it('latest -n 2 prints two newest, newest first', () => {
    touch('annotated-a.png', 30); touch('annotated-b.png', 20); touch('annotated-c.png', 10)
    runCli(['latest', '-n', '2'], io())
    const lines = out.join('\n').trim().split('\n')
    expect(lines.length).toBe(2)
    expect(lines[0]).toContain('annotated-c.png')
    expect(lines[1]).toContain('annotated-b.png')
  })

  it('latest returns non-zero and message when empty', () => {
    const code = runCli(['latest'], io())
    expect(code).toBe(1)
    expect(err.join('\n')).toMatch(/no annotations/i)
  })

  it('list --json emits an array', () => {
    touch('annotated-a.png', 10)
    runCli(['list', '--json'], io())
    const parsed = JSON.parse(out.join('\n'))
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed[0].name).toBe('annotated-a.png')
  })

  it('clean without --yes lists targets but deletes nothing', () => {
    touch('annotated-a.png', 10); touch('annotated-b.png', 5)
    const code = runCli(['clean', '--all'], io())
    expect(code).toBe(0)
    expect(readdirSync(dir).length).toBe(2)
    expect(out.join('\n')).toMatch(/would delete|--yes/i)
  })

  it('clean --all --yes deletes all annotated files', () => {
    touch('annotated-a.png', 10); touch('annotated-b.png', 5); touch('keep.txt', 1)
    const code = runCli(['clean', '--all', '--yes'], io())
    expect(code).toBe(0)
    expect(readdirSync(dir)).toEqual(['keep.txt'])
  })

  it('clean --keep 1 --yes keeps the newest only', () => {
    touch('annotated-a.png', 30); touch('annotated-b.png', 20); touch('annotated-c.png', 10)
    runCli(['clean', '--keep', '1', '--yes'], io())
    expect(readdirSync(dir)).toEqual(['annotated-c.png'])
  })

  it('unknown command returns non-zero with usage', () => {
    const code = runCli(['frobnicate'], io())
    expect(code).toBe(2)
    expect(err.join('\n')).toMatch(/usage/i)
  })
})
