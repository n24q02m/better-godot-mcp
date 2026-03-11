import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GodotMCPError } from '../../src/tools/helpers/errors.js'
import { safeResolve } from '../../src/tools/helpers/paths.js'

describe('safeResolve', () => {
  it('should safely resolve paths within project directory', () => {
    const baseDir = resolve('/mock-project')
    expect(safeResolve(baseDir, 'file.txt')).toBe(join(baseDir, 'file.txt'))
    expect(safeResolve(baseDir, 'subdir/file.txt')).toBe(join(baseDir, 'subdir/file.txt'))
    expect(safeResolve(baseDir, './file.txt')).toBe(join(baseDir, 'file.txt'))
  })

  it('should prevent path traversal outside project directory', () => {
    const baseDir = resolve('/mock-project')
    expect(() => safeResolve(baseDir, '../outside.txt')).toThrow(GodotMCPError)
    expect(() => safeResolve(baseDir, '../../etc/passwd')).toThrow(GodotMCPError)
    expect(() => safeResolve(baseDir, 'subdir/../../outside.txt')).toThrow(GodotMCPError)
  })

  it('should throw when path resolves to exactly outside prefix', () => {
    // Prefix-matching vulnerability test (e.g. /project vs /project-secrets)
    const baseDir = resolve('/mock-project')
    expect(() => safeResolve(baseDir, '../mock-project-secrets/file.txt')).toThrow(GodotMCPError)
  })

  it('should prevent path traversal when base is the root directory', () => {
    // Root directory traversal test
    const baseDir = resolve('/')
    // This previously bypassed checks because relative('/', '/etc/passwd') does not start with '..'
    expect(() => safeResolve(baseDir, '../etc/passwd')).toThrow(GodotMCPError)
  })

  it('should allow resolving exact base directory', () => {
    const baseDir = resolve('/mock-project')
    expect(safeResolve(baseDir, '.')).toBe(baseDir)
    expect(safeResolve(baseDir, '')).toBe(baseDir)
  })
})
