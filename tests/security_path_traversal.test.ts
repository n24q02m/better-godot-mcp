import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { handleScenes } from '../src/tools/composite/scenes.js'
import { handleScripts } from '../src/tools/composite/scripts.js'
import { handleShader } from '../src/tools/composite/shader.js'
import { createTmpProject, makeConfig } from './fixtures.js'

describe('Security: Path Traversal', () => {
  let projectPath: string
  let cleanupProject: () => void
  let outsideDir: string
  let secretFile: string

  beforeEach(() => {
    // Create a project directory
    const project = createTmpProject()
    projectPath = project.projectPath
    cleanupProject = project.cleanup

    // Create a directory outside the project
    outsideDir = join(tmpdir(), `godot-mcp-secret-${Date.now()}`)
    mkdirSync(outsideDir)
    secretFile = join(outsideDir, 'secret.txt')
    writeFileSync(secretFile, 'SUPER_SECRET_DATA')
  })

  afterEach(() => {
    cleanupProject()
    rmSync(outsideDir, { recursive: true, force: true })
  })

  it('should prevent reading scripts outside project directory', async () => {
    const _relativePath = join('..', `godot-mcp-secret-${Date.now()}`, 'secret.txt')
    // We need to calculate the relative path from projectPath to secretFile
    // secretFile is /tmp/godot-mcp-secret-123/secret.txt
    // projectPath is /tmp/godot-mcp-test-456
    // path.relative(projectPath, secretFile) should give us ../godot-mcp-secret-123/secret.txt

    // Actually, let's just use absolute path to be sure, or a constructed relative path.
    // The tools currently do: resolve(projectPath, scriptPath)
    // So if we pass a relative path that goes up, it should work if vulnerable.

    const relativeSecretPath = relative(projectPath, secretFile)

    await expect(
      handleScripts(
        'read',
        {
          project_path: projectPath,
          script_path: relativeSecretPath,
        },
        makeConfig(),
      ),
    ).rejects.toThrow(/Access denied|outside project/)
  })

  it('should prevent writing scripts outside project directory', async () => {
    const relativeSecretPath = relative(projectPath, secretFile)

    await expect(
      handleScripts(
        'write',
        {
          project_path: projectPath,
          script_path: relativeSecretPath,
          content: 'hacked',
        },
        makeConfig(),
      ),
    ).rejects.toThrow(/Access denied|outside project/)
  })

  it('should prevent reading scenes outside project directory', async () => {
    // Create a dummy scene outside
    const outsideScene = join(outsideDir, 'secret.tscn')
    writeFileSync(outsideScene, '[gd_scene format=3]\n[node name="Secret" type="Node"]\n')
    const relativeSecretPath = relative(projectPath, outsideScene)

    await expect(
      handleScenes(
        'info',
        {
          project_path: projectPath,
          scene_path: relativeSecretPath,
        },
        makeConfig(),
      ),
    ).rejects.toThrow(/Access denied|outside project/)
  })

  it('should prevent reading shaders outside project directory', async () => {
    // Create a dummy shader outside
    const outsideShader = join(outsideDir, 'secret.gdshader')
    writeFileSync(outsideShader, 'shader_type canvas_item;')
    const relativeSecretPath = relative(projectPath, outsideShader)

    await expect(
      handleShader(
        'read',
        {
          project_path: projectPath,
          shader_path: relativeSecretPath,
        },
        makeConfig(),
      ),
    ).rejects.toThrow(/Access denied|outside project/)
  })
})
