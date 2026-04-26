import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleScenes } from '../../src/tools/composite/scenes.js'

describe('Scenes Tool Security', () => {
  const projectPath = join(process.cwd(), 'tmp_security_scenes_test')
  const config: GodotConfig = { projectPath }

  beforeEach(() => {
    mkdirSync(projectPath, { recursive: true })
    writeFileSync(join(projectPath, 'project.godot'), '[config]')
  })

  afterEach(() => {
    rmSync(projectPath, { recursive: true, force: true })
  })

  it('should prevent injection in root_name (create)', async () => {
    const maliciousName = 'Root" type="Injected" parent=".'

    await expect(
      handleScenes(
        'create',
        {
          scene_path: 'new_scene.tscn',
          root_name: maliciousName,
          root_type: 'Node',
        },
        config,
      ),
    ).rejects.toThrow('Invalid root name')
  })

  it('should prevent injection in root_type (create)', async () => {
    const maliciousType = 'Node" parent="." injected="true'

    await expect(
      handleScenes(
        'create',
        {
          scene_path: 'new_scene.tscn',
          root_name: 'NewNode',
          root_type: maliciousType,
        },
        config,
      ),
    ).rejects.toThrow('Invalid root type')
  })

  it('should prevent newline injection in root_name (create)', async () => {
    const maliciousName = 'Root\n[node name="Injected" type="Node"]'

    await expect(
      handleScenes(
        'create',
        {
          scene_path: 'new_scene.tscn',
          root_name: maliciousName,
          root_type: 'Node',
        },
        config,
      ),
    ).rejects.toThrow('Invalid root name')
  })

  it('should prevent newline injection in root_type (create)', async () => {
    const maliciousType = 'Node\n[node name="Injected" type="Node"]'

    await expect(
      handleScenes(
        'create',
        {
          scene_path: 'new_scene.tscn',
          root_name: 'NewNode',
          root_type: maliciousType,
        },
        config,
      ),
    ).rejects.toThrow('Invalid root type')
  })
})
