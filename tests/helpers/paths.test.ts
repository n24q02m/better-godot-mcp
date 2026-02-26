import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { safeResolve } from '../../src/tools/helpers/paths.js'

describe('safeResolve', () => {
  const base = resolve('/tmp/project')

  it('should resolve valid relative paths', () => {
    expect(safeResolve(base, 'file.txt')).toBe(join(base, 'file.txt'))
    expect(safeResolve(base, 'subdir/file.txt')).toBe(join(base, 'subdir/file.txt'))
  })

  it('should resolve valid absolute paths inside base', () => {
    const absPath = join(base, 'file.txt')
    expect(safeResolve(base, absPath)).toBe(absPath)
  })

  it('should throw for path traversal', () => {
    expect(() => safeResolve(base, '../outside.txt')).toThrow('Access denied')
    expect(() => safeResolve(base, 'subdir/../../outside.txt')).toThrow('Access denied')
  })

  it('should throw for absolute paths outside base', () => {
    const outside = resolve('/tmp/outside.txt')
    expect(() => safeResolve(base, outside)).toThrow('Access denied')
  })
})
