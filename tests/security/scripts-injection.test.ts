import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleScripts } from '../../src/tools/composite/scripts.js'

describe('Scripts Injection Security Tests', () => {
  const projectPath = join(process.cwd(), 'tmp_security_scripts_injection_test')
  const config: GodotConfig = { projectPath }

  beforeEach(() => {
    mkdirSync(projectPath, { recursive: true })
    writeFileSync(join(projectPath, 'project.godot'), '[config]')
    writeFileSync(join(projectPath, 'scene.tscn'), '[gd_scene format=3]\n\n[node name="Root" type="Node"]\n')
  })

  afterEach(() => {
    rmSync(projectPath, { recursive: true, force: true })
  })

  it('should reject newlines in attachScript script_path', async () => {
    await expect(
      handleScripts('attach', { scene_path: 'scene.tscn', script_path: 'script.gd"\n[sub_resource]' }, config),
    ).rejects.toThrow('Invalid arguments: newlines not allowed')
  })
})
