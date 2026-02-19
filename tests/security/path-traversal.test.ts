import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { handleScripts } from '../../src/tools/composite/scripts.js'
import { createTmpProject, makeConfig } from '../fixtures.js'

describe('Security: Path Traversal', () => {
  let projectPath: string
  let cleanup: () => void
  let outsideDir: string
  let outsideFile: string

  beforeEach(() => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup

    // Create a unique directory outside the project
    const uniqueId = Math.random().toString(36).substring(7)
    outsideDir = resolve(projectPath, `../outside_${uniqueId}`)

    if (!existsSync(outsideDir)) {
      mkdirSync(outsideDir)
    }

    outsideFile = join(outsideDir, 'secret.txt')
    writeFileSync(outsideFile, 'secret data')
  })

  afterEach(() => {
    cleanup()
    // Force cleanup of outside dir
    if (existsSync(outsideDir)) {
      rmSync(outsideDir, { recursive: true, force: true })
    }
  })

  it('should prevent deleting files outside project directory', async () => {
    const config = makeConfig({ projectPath })

    try {
      await handleScripts(
        'delete',
        {
          project_path: projectPath,
          script_path: `../${resolve(outsideDir).split('/').pop()}/secret.txt`,
        },
        config,
      )
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('Path traversal detected')) {
        return
      }
    }

    expect(existsSync(outsideFile)).toBe(true)
  })

  it('should prevent reading files outside project directory', async () => {
    const config = makeConfig({ projectPath })
    const outsideDirName = resolve(outsideDir).split('/').pop()

    await expect(
      handleScripts(
        'read',
        {
          project_path: projectPath,
          script_path: `../${outsideDirName}/secret.txt`,
        },
        config,
      ),
    ).rejects.toThrow(/Path traversal detected/)
  })

  it('should prevent writing files outside project directory', async () => {
    const config = makeConfig({ projectPath })
    const outsideDirName = resolve(outsideDir).split('/').pop()

    await expect(
      handleScripts(
        'write',
        {
          project_path: projectPath,
          script_path: `../${outsideDirName}/new_secret.txt`,
          content: 'hacked',
        },
        config,
      ),
    ).rejects.toThrow(/Path traversal detected/)

    expect(existsSync(join(outsideDir, 'new_secret.txt'))).toBe(false)
  })
})
