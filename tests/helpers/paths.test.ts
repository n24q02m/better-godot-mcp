import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GodotMCPError } from '../../src/tools/helpers/errors.js'
import { safeResolve } from '../../src/tools/helpers/paths.js'

describe('safeResolve', () => {
  // Use a predictable base path
  const base = resolve(process.cwd(), 'test-project')

  it('should resolve relative path inside base', () => {
    const result = safeResolve(base, 'script.gd')
    expect(result).toBe(resolve(base, 'script.gd'))
  })

  it('should resolve absolute path inside base', () => {
    const absPath = resolve(base, 'subdir/script.gd')
    const result = safeResolve(base, absPath)
    expect(result).toBe(absPath)
  })

  it('should resolve nested relative path', () => {
    const result = safeResolve(base, 'scripts/player/movement.gd')
    expect(result).toBe(resolve(base, 'scripts/player/movement.gd'))
  })

  it('should resolve ".." that stays inside base', () => {
    const result = safeResolve(base, 'scripts/../main.gd')
    expect(result).toBe(resolve(base, 'main.gd'))
  })

  it('should throw for path traversal outside base', () => {
    expect(() => safeResolve(base, '../outside.gd')).toThrow(GodotMCPError)
    expect(() => safeResolve(base, '../outside.gd')).toThrow(/Path traversal detected/)
  })

  it('should throw for absolute path outside base', () => {
    // resolve('/') might differ on OS, but relative check handles it
    // On Linux: /etc/passwd is absolute.
    // On Windows: C:\Windows is absolute.
    // We use a path that is definitely outside 'test-project'
    const outside = resolve(process.cwd(), 'outside_project.gd')
    expect(() => safeResolve(base, outside)).toThrow(GodotMCPError)
  })

  it('should throw for complex traversal attempt', () => {
    expect(() => safeResolve(base, 'scripts/../../outside.gd')).toThrow(GodotMCPError)
  })
})
