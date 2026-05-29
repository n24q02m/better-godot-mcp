import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { GodotMCPError } from '../../src/tools/helpers/errors.js'
import { pathExists, safeResolve } from '../../src/tools/helpers/paths.js'

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

describe('safeResolve canonicalization (symlink / firmlink hardening)', () => {
  let realBase: string
  let outsideDir: string

  beforeAll(async () => {
    // realpath the temp dir up front so assertions are not confused by the
    // macOS firmlink layout (/var -> /private/var) of the OS temp location.
    const root = await realpath(await mkdtemp(join(tmpdir(), 'godot-mcp-safe-resolve-')))
    realBase = join(root, 'project')
    outsideDir = join(root, 'outside')
    await mkdir(realBase)
    await mkdir(outsideDir)
    await writeFile(join(outsideDir, 'secret.txt'), 'top secret')
  })

  afterAll(async () => {
    await rm(dirname(realBase), { recursive: true, force: true })
  })

  it('allows a legitimate path inside the real base directory', () => {
    const result = safeResolve(realBase, 'scenes/level.tscn')
    expect(result).toBe(resolve(realBase, 'scenes/level.tscn'))
  })

  it.skipIf(process.platform === 'win32')(
    'blocks traversal that escapes via a symlinked directory component',
    async () => {
      // Create a symlink INSIDE the base that points to a sibling outside dir.
      // A purely lexical check would treat `escape/secret.txt` as in-base, but
      // canonicalization reveals it resolves to the outside directory.
      const link = join(realBase, 'escape')
      await symlink(outsideDir, link, 'dir')

      expect(() => safeResolve(realBase, 'escape/secret.txt')).toThrowError(GodotMCPError)
      expect(() => safeResolve(realBase, 'escape/secret.txt')).toThrow(/Access denied/)
    },
  )

  it.skipIf(process.platform === 'win32')(
    'allows a symlinked directory component that still points inside the base',
    async () => {
      const innerReal = join(realBase, 'real-inner')
      await mkdir(innerReal)
      const innerLink = join(realBase, 'inner-link')
      await symlink(innerReal, innerLink, 'dir')

      // inner-link -> real-inner, both inside base, so this must be allowed.
      expect(() => safeResolve(realBase, 'inner-link/file.tscn')).not.toThrow()
      const result = safeResolve(realBase, 'inner-link/file.tscn')
      // The returned (lexical) path is still inside the base directory.
      const rel = relative(realBase, result)
      expect(rel.startsWith('..')).toBe(false)
    },
  )
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
})
