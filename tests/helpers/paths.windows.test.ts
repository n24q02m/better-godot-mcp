import { describe, expect, it, vi } from 'vitest'

// Mock node:path to behave like Windows regardless of host OS
vi.mock('node:path', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:path')>()
  const win32 = actual.win32
  return {
    ...actual,
    resolve: (...args: string[]) => win32.resolve(...args),
    relative: (from: string, to: string) => win32.relative(from, to),
    isAbsolute: (p: string) => win32.isAbsolute(p),
    sep: '\\',
    default: {
      ...win32,
      sep: '\\',
    },
  }
})

// Mock process.platform to be win32 for these tests
vi.stubGlobal('process', {
  ...process,
  platform: 'win32',
})

import { GodotMCPError } from '../../src/tools/helpers/errors.js'
// Import safeResolve AFTER mocking
import { safeResolve } from '../../src/tools/helpers/paths.js'

describe('safeResolve Windows-style (Mocked)', () => {
  const baseDir = 'C:\\project\\root'

  it('resolves valid Windows-style relative paths', () => {
    const target = 'src\\main.gd'
    const result = safeResolve(baseDir, target)
    expect(result).toBe('C:\\project\\root\\src\\main.gd')
  })

  it('throws on backslash traversal outside base directory', () => {
    const target = '..\\..\\Windows\\System32\\cmd.exe'
    expect(() => safeResolve(baseDir, target)).toThrow(GodotMCPError)
    expect(() => safeResolve(baseDir, target)).toThrow(/Access denied/)
  })

  it('throws on absolute path with drive letter outside base directory', () => {
    const target = 'D:\\other\\data'
    expect(() => safeResolve(baseDir, target)).toThrow(GodotMCPError)
  })

  it('throws on UNC paths', () => {
    const target = '\\\\remote-server\\share\\file.txt'
    expect(() => safeResolve(baseDir, target)).toThrow(GodotMCPError)
  })

  it('accepts absolute path that is actually inside base directory', () => {
    const target = 'C:\\project\\root\\src\\config.json'
    const result = safeResolve(baseDir, target)
    expect(result).toBe('C:\\project\\root\\src\\config.json')
  })

  it('throws for prefix-matching directory traversal attempts', () => {
    const target = '..\\root-secret\\file.ts'
    expect(() => safeResolve(baseDir, target)).toThrow(GodotMCPError)
  })
})
