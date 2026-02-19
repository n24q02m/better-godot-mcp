import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { findFiles } from '../../src/tools/helpers/files.js'
import { createTmpProject } from '../fixtures.js'

describe('files helper', () => {
  let tmpDir: string
  let cleanup: () => void

  beforeEach(() => {
    const tmp = createTmpProject()
    tmpDir = tmp.projectPath
    cleanup = tmp.cleanup
  })

  afterEach(() => {
    cleanup()
  })

  it('should find files with specific extension', () => {
    writeFileSync(join(tmpDir, 'file1.txt'), '')
    writeFileSync(join(tmpDir, 'file2.js'), '')
    writeFileSync(join(tmpDir, 'file3.txt'), '')

    const results = findFiles(tmpDir, new Set(['.txt']))
    expect(results).toHaveLength(2)
    expect(results.map((p) => p.toLowerCase())).toContain(join(tmpDir, 'file1.txt').toLowerCase())
    expect(results.map((p) => p.toLowerCase())).toContain(join(tmpDir, 'file3.txt').toLowerCase())
  })

  it('should find files recursively', () => {
    mkdirSync(join(tmpDir, 'subdir'))
    writeFileSync(join(tmpDir, 'subdir/file.txt'), '')

    const results = findFiles(tmpDir, new Set(['.txt']))
    expect(results).toHaveLength(1)
    expect(results[0].toLowerCase()).toContain(join(tmpDir, 'subdir/file.txt').toLowerCase())
  })

  it('should ignore hidden files/directories (starting with .)', () => {
    mkdirSync(join(tmpDir, '.hidden'))
    writeFileSync(join(tmpDir, '.hidden/file.txt'), '')
    writeFileSync(join(tmpDir, '.config'), '')

    const results = findFiles(tmpDir, new Set(['.txt', '']))
    expect(results).toHaveLength(0)
  })

  it('should ignore specified directories', () => {
    mkdirSync(join(tmpDir, 'ignore_me'))
    writeFileSync(join(tmpDir, 'ignore_me/file.txt'), '')

    const results = findFiles(tmpDir, new Set(['.txt']), ['ignore_me'])
    expect(results).toHaveLength(0)
  })

  it('should ignore DEFAULT_IGNORE_DIRS by default', () => {
    mkdirSync(join(tmpDir, 'node_modules'))
    writeFileSync(join(tmpDir, 'node_modules/pkg.txt'), '')
    mkdirSync(join(tmpDir, 'build'))
    writeFileSync(join(tmpDir, 'build/out.txt'), '')

    const results = findFiles(tmpDir, new Set(['.txt']))
    expect(results).toHaveLength(0)
  })

  it('should be case insensitive for extensions', () => {
    writeFileSync(join(tmpDir, 'File.TXT'), '')

    const results = findFiles(tmpDir, new Set(['.txt']))
    expect(results).toHaveLength(1)
    expect(results[0].endsWith('File.TXT')).toBe(true)
  })
})
