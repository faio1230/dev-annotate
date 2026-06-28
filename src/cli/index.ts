#!/usr/bin/env node
import { resolve } from 'node:path'
import { unlinkSync, watch as fsWatch } from 'node:fs'
import { listAnnotations, latestAnnotation, type AnnotationFile } from '../shared/store.js'
import { DEFAULT_DIR } from '../server/save.js'

interface Io { cwd?: string; log?: (s: string) => void; error?: (s: string) => void }

interface Flags {
  n?: number
  keep?: number
  json: boolean
  all: boolean
  yes: boolean
  dir?: string
}

function parseFlags(args: string[]): Flags {
  const f: Flags = { json: false, all: false, yes: false }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--json') f.json = true
    else if (a === '--all') f.all = true
    else if (a === '--yes') f.yes = true
    else if (a === '-n') f.n = Number(args[++i] ?? '')
    else if (a === '--keep') f.keep = Number(args[++i] ?? '')
    else if (a === '--dir') f.dir = args[++i] ?? undefined
  }
  return f
}

const USAGE = `usage: dev-annotate <latest|list|watch|clean> [options]
  latest [-n N] [--json] [--dir D]   newest annotation path(s)
  list   [-n N] [--json] [--dir D]   all annotations, newest first
  watch  [--json] [--dir D]          print path when a new annotation arrives
  clean  [--keep N | --all] [--yes] [--dir D]   delete old/all annotations

  --dir D  annotation directory (default: ${DEFAULT_DIR})`

export function runCli(argv: string[], io: Io = {}): number {
  const log = io.log ?? ((s: string) => process.stdout.write(s + '\n'))
  const error = io.error ?? ((s: string) => process.stderr.write(s + '\n'))
  const cwd = io.cwd ?? process.cwd()
  const [cmd, ...rest] = argv
  const flags = parseFlags(rest)
  const dir = resolve(cwd, flags.dir ?? DEFAULT_DIR)

  const emit = (files: AnnotationFile[]) => {
    if (flags.json) log(JSON.stringify(files.map(f => ({ path: f.path, name: f.name, bytes: f.bytes, mtimeMs: f.mtimeMs })), null, 2))
    else for (const f of files) log(f.path)
  }

  switch (cmd) {
    case 'latest': {
      const files = listAnnotations(dir, flags.n ?? 1)
      if (files.length === 0) { error('no annotations found'); return 1 }
      emit(files)
      return 0
    }
    case 'list': {
      emit(listAnnotations(dir, flags.n))
      return 0
    }
    case 'clean': {
      const all = listAnnotations(dir)
      const keep = flags.all ? 0 : (flags.keep ?? 0)
      const targets = all.slice(keep)
      if (targets.length === 0) { log('nothing to delete'); return 0 }
      if (!flags.yes) {
        log(`would delete ${targets.length} file(s) (pass --yes to confirm):`)
        for (const f of targets) log(f.path)
        return 0
      }
      for (const f of targets) unlinkSync(f.path)
      log(`deleted ${targets.length} file(s)`)
      return 0
    }
    case 'watch': {
      log(`watching ${dir} … (Ctrl+C to stop)`)
      const latest = latestAnnotation(dir)
      let lastMtime = latest?.mtimeMs ?? 0
      fsWatch(dir, () => {
        const f = latestAnnotation(dir)
        if (f && f.mtimeMs > lastMtime) {
          lastMtime = f.mtimeMs
          if (flags.json) log(JSON.stringify({ path: f.path, name: f.name, bytes: f.bytes, mtimeMs: f.mtimeMs }))
          else log(f.path)
        }
      })
      return 0 // blocks via fs.watch keeping the event loop alive
    }
    default:
      error(USAGE)
      return 2
  }
}

// bin entry
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('cli.js')) {
  process.exit(runCli(process.argv.slice(2)))
}
