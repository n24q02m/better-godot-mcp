import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { handleResources } from '../../src/tools/composite/resources.js'
import { GodotMCPError } from '../../src/tools/helpers/errors.js'
import { makeConfig } from '../fixtures.js'

describe('resources security', () => {
  const tmpDir = resolve(`temp_security_test_${Date.now()}`)
  const projectPath = join(tmpDir, 'project')
  const sensitiveFile = join(tmpDir, 'sensitive.txt')

  beforeAll(() => {
    mkdirSync(projectPath, { recursive: true })
    writeFileSync(sensitiveFile, 'secret data')
    // Create a valid resource inside project to ensure tool works
    writeFileSync(join(projectPath, 'valid.tres'), 'resource')
  })

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('should prevent path traversal in info action', async () => {
    const config = makeConfig({ projectPath })

    // Attempt to access file outside project
    try {
      await handleResources(
        'info',
        {
          project_path: projectPath,
          resource_path: '../sensitive.txt',
        },
        config,
      )

      throw new Error('Should have thrown access denied')
    } catch (error) {
      expect(error).toBeInstanceOf(GodotMCPError)
      if (error instanceof GodotMCPError) {
        expect(error.code).toBe('ACCESS_DENIED')
        expect(error.message).toContain('outside the project root')
      }
    }
  })

  it('should allow accessing valid resources inside project', async () => {
    const config = makeConfig({ projectPath })

    const result = await handleResources(
      'info',
      {
        project_path: projectPath,
        resource_path: 'valid.tres',
      },
      config,
    )

    const data = JSON.parse(result.content[0].text)
    expect(data.path).toBe('valid.tres')
  })
})
