import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { handleNodes } from '../../src/tools/composite/nodes.js'

describe('nodes path normalization integration', () => {
  const projectPath = join(tmpdir(), `godot-mcp-norm-test-${Date.now()}`)
  const config = { projectPath }

  const MINIMAL_TSCN = `[gd_scene format=3]

[node name="Root" type="Node"]
`

  beforeAll(() => {
    mkdirSync(projectPath, { recursive: true })
    writeFileSync(join(projectPath, 'test.tscn'), MINIMAL_TSCN)
  })

  afterAll(() => {
    rmSync(projectPath, { recursive: true, force: true })
  })

  it('should handle /root/SceneName/ prefix in add action', async () => {
    // This should add "Child" under "Root" (which is '.')
    const result = await handleNodes(
      'add',
      {
        project_path: projectPath,
        scene_path: 'test.tscn',
        name: 'Child',
        parent: '/root/Root/',
      },
      config as unknown as GodotConfig,
    )

    expect(result.content[0].text).toContain('under .')
  })

  it('should handle backslashes and case-insensitivity', async () => {
    const result = await handleNodes(
      'add',
      {
        project_path: projectPath,
        scene_path: 'test.tscn',
        name: 'Child2',
        parent: 'ROOT\\Root',
      },
      config as unknown as GodotConfig,
    )

    expect(result.content[0].text).toContain('under .')
  })

  it('should handle deep paths under root', async () => {
    // First add a parent
    await handleNodes(
      'add',
      {
        project_path: projectPath,
        scene_path: 'test.tscn',
        name: 'MyParent',
        parent: '.',
      },
      config as unknown as GodotConfig,
    )

    const result = await handleNodes(
      'add',
      {
        project_path: projectPath,
        scene_path: 'test.tscn',
        name: 'DeepChild',
        parent: '/root/Root/MyParent',
      },
      config as unknown as GodotConfig,
    )

    expect(result.content[0].text).toContain('under MyParent')
  })

  it('should handle leading slash without root', async () => {
    const result = await handleNodes(
      'add',
      {
        project_path: projectPath,
        scene_path: 'test.tscn',
        name: 'AnotherChild',
        parent: '/MyParent',
      },
      config as unknown as GodotConfig,
    )

    expect(result.content[0].text).toContain('under MyParent')
  })
})
