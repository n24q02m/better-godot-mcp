import { access, mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { GodotMCPError } from '../../src/tools/helpers/errors.js'
import { pathExists, resolveProjectRoot, safeResolve } from '../../src/tools/helpers/paths.js'

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...actual,
    access: vi.fn(actual.access),
    realpath: vi.fn(actual.realpath),
  }
})

describe('safeResolve', () => {
  const baseDir = resolve('/mock/base/dir')

  it('resolves valid relative paths inside the base directory', async () => {
    const target = 'src/file.ts'
    const result = await safeResolve(baseDir, target)
    expect(result).toBe(resolve(baseDir, target))
  })

  it('resolves valid absolute paths inside the base directory', async () => {
    const target = resolve(baseDir, 'src/file.ts')
    const result = await safeResolve(baseDir, target)
    expect(result).toBe(target)
  })

  it('resolves paths with dot (.) correctly', async () => {
    const target = './src/file.ts'
    const result = await safeResolve(baseDir, target)
    expect(result).toBe(resolve(baseDir, 'src/file.ts'))
  })

  it('resolves paths with dot-dot (..) that remain inside the base directory', async () => {
    const target = 'src/../lib/file.ts'
    const result = await safeResolve(baseDir, target)
    expect(result).toBe(resolve(baseDir, 'lib/file.ts'))
  })

  it('throws GodotMCPError when path attempts to traverse outside base directory', async () => {
    const target = '../outside.ts'
    await expect(safeResolve(baseDir, target)).rejects.toThrowError(GodotMCPError)
    await expect(safeResolve(baseDir, target)).rejects.toThrow(/Access denied/)
  })

  it('throws GodotMCPError when absolute path is outside base directory', async () => {
    const target = resolve('/some/other/path')
    await expect(safeResolve(baseDir, target)).rejects.toThrowError(GodotMCPError)
  })

  it('throws GodotMCPError when path traverses up and outside, even if it tries to go back in', async () => {
    const target = '../../mock/base/dir/file.ts'
    await expect(safeResolve(baseDir, target)).rejects.toThrowError(GodotMCPError)
  })

  it('throws GodotMCPError on complex path traversals (e.g., Unix /etc/passwd)', async () => {
    const target = '../../../../../../../../../../etc/passwd'
    await expect(safeResolve(baseDir, target)).rejects.toThrowError(GodotMCPError)
    await expect(safeResolve(baseDir, target)).rejects.toThrow(/Access denied/)
  })

  it.skipIf(process.platform !== 'win32')('throws GodotMCPError on Windows-style path traversals', async () => {
    const target = '..\\..\\..\\Windows\\System32\\cmd.exe'
    await expect(safeResolve(baseDir, target)).rejects.toThrowError(GodotMCPError)
    await expect(safeResolve(baseDir, target)).rejects.toThrow(/Access denied/)
  })

  it('throws GodotMCPError for prefix-matching directory traversal attempts (relative)', async () => {
    const target = '../dir-secret/file.ts'
    await expect(safeResolve(baseDir, target)).rejects.toThrowError(GodotMCPError)
    await expect(safeResolve(baseDir, target)).rejects.toThrow(/Access denied/)
  })

  it('throws GodotMCPError for prefix-matching directory traversal attempts (absolute)', async () => {
    const target = '/mock/base/dir-secret/file.ts'
    await expect(safeResolve(baseDir, target)).rejects.toThrowError(GodotMCPError)
    await expect(safeResolve(baseDir, target)).rejects.toThrow(/Access denied/)
  })

  it('covers canonicalize root fallback when realpath throws at root', async () => {
    const mockedRealpath = vi.mocked(realpath)
    mockedRealpath.mockRejectedValue(new Error('Root error'))

    try {
      const result = await safeResolve('/some/dir', 'file.ts')
      expect(result).toBe(resolve('/some/dir', 'file.ts'))
    } finally {
      mockedRealpath.mockRestore()
    }
  })
})

describe('safeResolve canonicalization (symlink / firmlink hardening)', () => {
  let realBase: string
  let outsideDir: string

  beforeAll(async () => {
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

  it('allows a legitimate path inside the real base directory', async () => {
    const result = await safeResolve(realBase, 'scenes/level.tscn')
    expect(result).toBe(resolve(realBase, 'scenes/level.tscn'))
  })

  it.skipIf(process.platform === 'win32')(
    'blocks traversal that escapes via a symlinked directory component',
    async () => {
      const link = join(realBase, 'escape')
      await symlink(outsideDir, link, 'dir')

      await expect(safeResolve(realBase, 'escape/secret.txt')).rejects.toThrowError(GodotMCPError)
      await expect(safeResolve(realBase, 'escape/secret.txt')).rejects.toThrow(/Access denied/)
    },
  )

  it.skipIf(process.platform === 'win32')(
    'allows a symlinked directory component that still points inside the base',
    async () => {
      const innerReal = join(realBase, 'real-inner')
      await mkdir(innerReal)
      const innerLink = join(realBase, 'inner-link')
      await symlink(innerReal, innerLink, 'dir')

      await expect(safeResolve(realBase, 'inner-link/file.tscn')).resolves.not.toThrow()
      const result = await safeResolve(realBase, 'inner-link/file.tscn')
      const rel = relative(realBase, result)
      expect(rel.startsWith('..')).toBe(false)
    },
  )
})

describe('resolveProjectRoot', () => {
  const trustedBase = resolve('/mock/trusted/project')

  it('returns the resolved trusted base when no project_path is given', async () => {
    expect(await resolveProjectRoot(undefined, trustedBase)).toBe(trustedBase)
    expect(await resolveProjectRoot('', trustedBase)).toBe(trustedBase)
    expect(await resolveProjectRoot(null, trustedBase)).toBe(trustedBase)
  })

  it('falls back to process.cwd() when trusted base is unset', async () => {
    expect(await resolveProjectRoot(undefined, null)).toBe(resolve(process.cwd()))
    expect(await resolveProjectRoot(undefined, undefined)).toBe(resolve(process.cwd()))
  })

  it('confines a relative project_path within the trusted base', async () => {
    expect(await resolveProjectRoot('sub/project', trustedBase)).toBe(resolve(trustedBase, 'sub/project'))
  })

  it('accepts an absolute project_path that is inside the trusted base', async () => {
    const inside = resolve(trustedBase, 'inner')
    expect(await resolveProjectRoot(inside, trustedBase)).toBe(inside)
  })

  it('rejects an absolute project_path outside the trusted base', async () => {
    await expect(resolveProjectRoot(resolve('/etc'), trustedBase)).rejects.toThrowError(GodotMCPError)
    await expect(resolveProjectRoot(resolve('/etc'), trustedBase)).rejects.toThrow(/Access denied/)
  })

  it('rejects a relative project_path that traverses outside the trusted base', async () => {
    await expect(resolveProjectRoot('../../etc', trustedBase)).rejects.toThrowError(GodotMCPError)
  })

  it('ignores non-string project_path values', async () => {
    expect(await resolveProjectRoot(123, trustedBase)).toBe(trustedBase)
    expect(await resolveProjectRoot({ evil: '../../etc' }, trustedBase)).toBe(trustedBase)
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

  it('returns false when access throws EACCES (permission denied)', async () => {
    const mockedAccess = vi.mocked(access)
    const error = new Error('Permission denied')
    ;(error as NodeJS.ErrnoException).code = 'EACCES'
    mockedAccess.mockRejectedValue(error)

    try {
      expect(await pathExists('/any/path')).toBe(false)
    } finally {
      mockedAccess.mockRestore()
    }
  })

  it('returns false when access rejects with null', async () => {
    const mockedAccess = vi.mocked(access)
    mockedAccess.mockRejectedValue(null)

    try {
      expect(await pathExists('/any/path')).toBe(false)
    } finally {
      mockedAccess.mockRestore()
    }
  })

  it('returns false when access rejects with undefined', async () => {
    const mockedAccess = vi.mocked(access)
    mockedAccess.mockRejectedValue(undefined)

    try {
      expect(await pathExists('/any/path')).toBe(false)
    } finally {
      mockedAccess.mockRestore()
    }
  })

  it('returns false when access rejects with a string', async () => {
    const mockedAccess = vi.mocked(access)
    mockedAccess.mockRejectedValue('Error string')

    try {
      expect(await pathExists('/any/path')).toBe(false)
    } finally {
      mockedAccess.mockRestore()
    }
  })

  it('returns false when access rejects with a number', async () => {
    const mockedAccess = vi.mocked(access)
    mockedAccess.mockRejectedValue(500)

    try {
      expect(await pathExists('/any/path')).toBe(false)
    } finally {
      mockedAccess.mockRestore()
    }
  })

  it('returns false when access throws an unexpected error', async () => {
    const mockedAccess = vi.mocked(access)
    mockedAccess.mockRejectedValue(new Error('Unexpected error'))

    try {
      expect(await pathExists('/any/path')).toBe(false)
    } finally {
      mockedAccess.mockRestore()
    }
  })
})
