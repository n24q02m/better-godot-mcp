import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { handleResources } from '../../src/tools/composite/resources.js'
import { createTmpProject, makeConfig } from '../fixtures.js'

describe('Vulnerability Reproduction: Path Traversal in handleResources delete', () => {
  it('should PREVENT deleting a file outside the project directory', async () => {
    // 1. Create a "project" directory
    const { projectPath, cleanup } = createTmpProject()
    const config = makeConfig({ projectPath })

    // 2. Create a "victim" directory OUTSIDE the project directory
    const victimDir = join(tmpdir(), `godot-mcp-victim-${Date.now()}`)
    mkdirSync(victimDir)
    const victimFile = join(victimDir, 'secret.txt')
    writeFileSync(victimFile, 'This file should NOT be deleted!', 'utf-8')

    // 3. Construct a malicious path using traversal to reach the victim file
    const maliciousPath = relative(projectPath, victimFile)

    // 4. Attempt to delete the victim file via handleResources
    // We expect this to throw an error now due to safeResolve
    let errorThrown = false
    try {
      await handleResources('delete', { resource_path: maliciousPath, project_path: projectPath }, config)
    } catch (error) {
      errorThrown = true
      if (error instanceof Error) {
        expect(error.message).toContain('Access denied')
      }
    }

    expect(errorThrown).toBe(true)

    // 5. Assert that the file is STILL THERE
    const fileExists = existsSync(victimFile)

    // Cleanup first
    rmSync(victimDir, { recursive: true, force: true })
    cleanup()

    expect(fileExists).toBe(true)
  })
})
