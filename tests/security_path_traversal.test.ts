import { existsSync, mkdirSync, rmdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../src/godot/types.js'
import { handleScripts } from '../src/tools/composite/scripts.js'
import { GodotMCPError } from '../src/tools/helpers/errors.js'

describe('Security: Path Traversal', () => {
  const tmpDir = resolve('tmp_security_test')
  const projectPath = join(tmpDir, 'project')
  const secretFile = join(tmpDir, 'secret.txt')
  const secretContent = 'SUPER_SECRET_DATA'

  const mockConfig: GodotConfig = {
    projectPath: projectPath,
    godotPath: 'godot',
    version: { major: 4, minor: 3, patch: 0, label: 'stable', raw: '4.3.0.stable' },
  }

  beforeAll(() => {
    if (existsSync(tmpDir)) {
      rmdirSync(tmpDir, { recursive: true })
    }
    mkdirSync(tmpDir)
    mkdirSync(projectPath)
    writeFileSync(secretFile, secretContent)
  })

  afterAll(() => {
    if (existsSync(tmpDir)) {
      try {
        rmdirSync(tmpDir, { recursive: true })
      } catch {}
    }
  })

  it('should block path traversal attempts', async () => {
    // Attempt to read the secret file using relative path
    // We expect this to throw an ACCESS_DENIED error
    await expect(
      handleScripts(
        'read',
        {
          project_path: projectPath,
          script_path: '../secret.txt',
        },
        mockConfig,
      ),
    ).rejects.toThrow(/Access denied/)

    try {
      await handleScripts(
        'read',
        {
          project_path: projectPath,
          script_path: '../secret.txt',
        },
        mockConfig,
      )
    } catch (e: unknown) {
      if (e instanceof GodotMCPError) {
        expect(e.code).toBe('ACCESS_DENIED')
      } else {
        throw e
      }
    }
  })
})
