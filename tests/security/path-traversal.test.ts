import { existsSync, unlinkSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleScripts } from '../../src/tools/composite/scripts.js'
import { createTmpProject, makeConfig } from '../fixtures.js'

describe('Security: Path Traversal', () => {
  let projectPath: string
  let cleanup: () => void
  let config: GodotConfig

  beforeEach(() => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
    config = makeConfig({ projectPath })
  })

  afterEach(() => cleanup())

  it('should prevent creating a script outside the project directory', async () => {
    // Attempt to create a script in the parent directory of the project
    const exploitPath = '../exploit.gd'
    const fullExploitPath = resolve(projectPath, exploitPath)

    // Clean up if it exists from previous runs
    if (existsSync(fullExploitPath)) {
      unlinkSync(fullExploitPath)
    }

    // This should THROW an error if secure.
    await expect(
      handleScripts(
        'create',
        {
          project_path: projectPath,
          script_path: exploitPath,
        },
        config,
      ),
    ).rejects.toThrow(/Access denied|outside of project/i)

    // verify file was not created
    expect(existsSync(fullExploitPath)).toBe(false)

    // Final cleanup just in case
    if (existsSync(fullExploitPath)) {
      unlinkSync(fullExploitPath)
    }
  })

  it('should prevent reading a script outside the project directory', async () => {
    // Create a sensitive file outside project root
    const outsideFile = join(projectPath, '../secret.txt')
    writeFileSync(outsideFile, 'secret data', 'utf-8')

    // Try to read it
    await expect(
      handleScripts(
        'read',
        {
          project_path: projectPath,
          script_path: '../secret.txt',
        },
        config,
      ),
    ).rejects.toThrow(/Access denied|outside of project/i)
  })
})
