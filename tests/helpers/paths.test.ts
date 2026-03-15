import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GodotMCPError } from '../../src/tools/helpers/errors.js'
import { safeResolve } from '../../src/tools/helpers/paths.js'

describe('safeResolve', () => {
  const baseDir = resolve('/mock/base/dir')

  it('resolves valid relative paths inside the base directory', () => {
    const target = 'src/file.ts'
    const result = safeResolve(baseDir, target)
    expect(result).toBe(resolve(baseDir, target))
  })

  it('resolves valid absolute paths inside the base directory', () => {
    const target = resolve(baseDir, 'src/file.ts')
    const result = safeResolve(baseDir, target)
    expect(result).toBe(target)
  })

  it('resolves paths with dot (.) correctly', () => {
    const target = './src/file.ts'
    const result = safeResolve(baseDir, target)
    expect(result).toBe(resolve(baseDir, 'src/file.ts'))
  })

  it('resolves paths with dot-dot (..) that remain inside the base directory', () => {
    const target = 'src/../lib/file.ts'
    const result = safeResolve(baseDir, target)
    expect(result).toBe(resolve(baseDir, 'lib/file.ts'))
  })

  it('throws GodotMCPError when path attempts to traverse outside base directory', () => {
    const target = '../outside.ts'
    expect(() => safeResolve(baseDir, target)).toThrowError(GodotMCPError)
    expect(() => safeResolve(baseDir, target)).toThrow(/Access denied/)
  })

  it('throws GodotMCPError when absolute path is outside base directory', () => {
    const target = resolve('/some/other/path')
    expect(() => safeResolve(baseDir, target)).toThrowError(GodotMCPError)
  })

  it('throws GodotMCPError when path traverses up and outside, even if it tries to go back in', () => {
    const target = '../../mock/base/dir/file.ts'
    expect(() => safeResolve(baseDir, target)).toThrowError(GodotMCPError)
  })

  it('throws GodotMCPError on complex path traversals (e.g., Unix /etc/passwd)', () => {
    const target = '../../../../../../../../../../etc/passwd'
    expect(() => safeResolve(baseDir, target)).toThrowError(GodotMCPError)
    expect(() => safeResolve(baseDir, target)).toThrow(/Access denied/)
  })

  it.skipIf(process.platform !== 'win32')('throws GodotMCPError on Windows-style path traversals', () => {
    const target = '..\\..\\..\\Windows\\System32\\cmd.exe'
    expect(() => safeResolve(baseDir, target)).toThrowError(GodotMCPError)
    expect(() => safeResolve(baseDir, target)).toThrow(/Access denied/)
  })

  it('throws GodotMCPError for prefix-matching directory traversal attempts (relative)', () => {
    const target = '../dir-secret/file.ts'
    expect(() => safeResolve(baseDir, target)).toThrowError(GodotMCPError)
    expect(() => safeResolve(baseDir, target)).toThrow(/Access denied/)
  })

  it('throws GodotMCPError for prefix-matching directory traversal attempts (absolute)', () => {
    const target = '/mock/base/dir-secret/file.ts'
    expect(() => safeResolve(baseDir, target)).toThrowError(GodotMCPError)
    expect(() => safeResolve(baseDir, target)).toThrow(/Access denied/)
  })
})
