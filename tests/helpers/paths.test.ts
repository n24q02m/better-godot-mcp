import { describe, expect, it } from 'vitest'
import { join, resolve, sep } from 'node:path'
import { safeResolve } from '../../src/tools/helpers/paths.js'

describe('safeResolve', () => {
  const basePath = resolve('test-project')

  it('should resolve simple relative paths', () => {
    const result = safeResolve(basePath, 'scene.tscn')
    expect(result).toBe(resolve(basePath, 'scene.tscn'))
  })

  it('should resolve nested relative paths', () => {
    const result = safeResolve(basePath, 'scenes/level1/map.tscn')
    expect(result).toBe(resolve(basePath, 'scenes/level1/map.tscn'))
  })

  it('should handle parent directory references that stay inside', () => {
    const result = safeResolve(basePath, 'scenes/../utils.gd')
    expect(result).toBe(resolve(basePath, 'utils.gd'))
  })

  it('should throw on parent directory traversal', () => {
    expect(() => safeResolve(basePath, '../outside.txt')).toThrow('Access denied')
  })

  it('should throw on multiple parent directory traversal', () => {
    expect(() => safeResolve(basePath, 'scenes/../../outside.txt')).toThrow('Access denied')
  })

  it('should throw on absolute path outside base', () => {
    const outsidePath = resolve(basePath, '..', 'outside.txt')
    expect(() => safeResolve(basePath, outsidePath)).toThrow('Access denied')
  })

  it('should allow absolute path inside base', () => {
    const insidePath = resolve(basePath, 'inside.txt')
    const result = safeResolve(basePath, insidePath)
    expect(result).toBe(insidePath)
  })

  it('should handle empty path (resolves to base)', () => {
    const result = safeResolve(basePath, '')
    expect(result).toBe(basePath)
  })

  it('should handle . path (resolves to base)', () => {
    const result = safeResolve(basePath, '.')
    expect(result).toBe(basePath)
  })

  it('should prevent access to root', () => {
    expect(() => safeResolve(basePath, '/')).toThrow('Access denied')
  })

  // Windows specific test (will only run if on Windows or mocked)
  // Since we are likely on Linux, we can mock process.platform if needed, but vitest runs in strict mode.
  // We rely on the logic being correct.
})
