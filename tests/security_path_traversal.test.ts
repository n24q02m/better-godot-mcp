import { existsSync, unlinkSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../src/godot/types.js'
import { handleScripts } from '../src/tools/composite/scripts.js'
import { createTmpProject, makeConfig } from './fixtures.js'

describe('Security: Path Traversal', () => {
  let projectPath: string
  let cleanup: () => void
  let config: GodotConfig
  let secretFile: string
  let outsideDir: string

  beforeEach(() => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
    config = makeConfig({ projectPath })

    // Create a file outside the project directory
    outsideDir = resolve(projectPath, '..')
    secretFile = join(outsideDir, `secret_${Date.now()}.txt`)
    writeFileSync(secretFile, 'secret content', 'utf-8')
  })

  afterEach(() => {
    try {
      if (existsSync(secretFile)) unlinkSync(secretFile)
    } catch {}
    cleanup()
  })

  it('should prevent reading files outside project directory', async () => {
    // Attempt to read the file using path traversal
    // This should fail with ACCESS_DENIED
    await expect(
      handleScripts(
        'read',
        {
          project_path: projectPath,
          script_path: `../${secretFile.split(/[/\\]/).pop()}`,
        },
        config,
      ),
    ).rejects.toThrow(/ACCESS_DENIED|Access denied/)
  })

  it('should prevent writing files outside project directory', async () => {
    const pwnedFile = join(outsideDir, `pwned_${Date.now()}.gd`)

    // Attempt to write outside
    await expect(
      handleScripts(
        'write',
        {
          project_path: projectPath,
          script_path: `../${pwnedFile.split(/[/\\]/).pop()}`,
          content: 'extends Node',
        },
        config,
      ),
    ).rejects.toThrow(/ACCESS_DENIED|Access denied/)

    expect(existsSync(pwnedFile)).toBe(false)
  })
})
