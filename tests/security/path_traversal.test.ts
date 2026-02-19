import { existsSync, mkdirSync, rmSync } from 'node:fs'
import type { GodotConfig } from '../../src/godot/types.js'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { handleScripts } from '../../src/tools/composite/scripts.js'
import { createTmpProject, makeConfig } from '../fixtures.js'

describe('Path Traversal Security', () => {
  let projectPath: string
  let outsidePath: string
  let cleanup: () => void
  let config: GodotConfig

  beforeEach(() => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
    config = makeConfig({ projectPath })

    // Create a directory outside the project
    outsidePath = join(tmpdir(), `godot-mcp-outside-${Math.random().toString(36).slice(2)}`)
    mkdirSync(outsidePath)
  })

  afterEach(() => {
    cleanup()
    if (existsSync(outsidePath)) {
      rmSync(outsidePath, { recursive: true, force: true })
    }
  })

  it('should prevent writing scripts outside the project directory', async () => {
    const sensitiveFile = join(outsidePath, 'pwned.gd')
    const relativePath = relative(projectPath, sensitiveFile)

    // Attempt to write outside the project
    // This expects the promise to reject with an error mentioning access denied or similar
    await expect(
      handleScripts(
        'create',
        {
          project_path: projectPath,
          script_path: relativePath,
        },
        config,
      ),
    ).rejects.toThrow(/Access denied|outside project/i)

    expect(existsSync(sensitiveFile)).toBe(false)
  })
})
