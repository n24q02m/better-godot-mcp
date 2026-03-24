import * as fsPromises from 'node:fs/promises'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { GodotMCPError } from '../../src/tools/helpers/errors.js'
import { pathExists, safeResolve } from '../../src/tools/helpers/paths.js'

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...actual,
    access: vi.fn().mockImplementation(actual.access),
  }
})

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

describe('pathExists', () => {
  let testDir: string

  beforeAll(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'godot-mcp-paths-test-'))
  })

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  it('returns true when checking an existing directory', async () => {
    const dirPath = join(testDir, 'existing-dir')
    await mkdir(dirPath)

    expect(await pathExists(dirPath)).toBe(true)
  })

  it('returns true when checking an existing file', async () => {
    const filePath = join(testDir, 'existing-file.txt')
    await writeFile(filePath, 'test content')

    expect(await pathExists(filePath)).toBe(true)
  })

  it('returns false when checking a non-existent path', async () => {
    const nonExistentPath = join(testDir, 'does-not-exist')

    expect(await pathExists(nonExistentPath)).toBe(false)
  })

  it('returns false when access throws an error (e.g. EACCES)', async () => {
    const errorPath = join(testDir, 'forbidden-file.txt')

    const accessSpy = vi.mocked(fsPromises.access).mockRejectedValueOnce(new Error('EACCES: permission denied'))

    try {
      expect(await pathExists(errorPath)).toBe(false)
      expect(accessSpy).toHaveBeenCalledWith(errorPath)
    } finally {
      accessSpy.mockClear()
    }
  })
})
