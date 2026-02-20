
import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { handleScripts } from '../../src/tools/composite/scripts.js'
import { createTmpProject, makeConfig } from '../fixtures.js'

describe('Path Traversal Security', () => {
  let projectPath: string
  let cleanup: () => void
  let outsideFile: string

  beforeEach(() => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup

    // Create a file outside the project directory (sibling)
    outsideFile = join(projectPath, '../outside_secret.txt')
    writeFileSync(outsideFile, 'secret content')
  })

  afterEach(() => {
    cleanup()
    if (existsSync(outsideFile)) {
      rmSync(outsideFile)
    }
  })

  it('should prevent reading files outside project directory via ../', async () => {
    const config = makeConfig({ projectPath })

    // Attempt to read the file outside the project directory
    // This should fail with a security error
    await expect(handleScripts(
      'read',
      {
        project_path: projectPath,
        script_path: '../outside_secret.txt'
      },
      config
    )).rejects.toThrow(/Access denied|Path traversal detected/i)
  })

  it('should prevent writing files outside project directory via ../', async () => {
    const config = makeConfig({ projectPath })

    await expect(handleScripts(
      'write',
      {
        project_path: projectPath,
        script_path: '../outside_hacker.gd',
        content: 'extends Node'
      },
      config
    )).rejects.toThrow(/Access denied|Path traversal detected/i)
  })
})
