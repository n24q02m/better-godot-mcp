/**
 * Security tests for Scripts tool - prevent .tscn file injection via attach
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleScripts } from '../../src/tools/composite/scripts.js'
import { createTmpProject, createTmpScene, createTmpScript, makeConfig } from '../fixtures.js'

describe('scripts security', () => {
  let projectPath: string
  let cleanup: () => void
  let config: GodotConfig

  beforeEach(() => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
    config = makeConfig({ projectPath })

    createTmpScene(projectPath, 'scenes/main.tscn')
    createTmpScript(projectPath, 'player.gd')
  })

  afterEach(() => cleanup())

  describe('attach action - script_path injection prevention', () => {
    it('rejects script_path with newline', async () => {
      await expect(
        handleScripts(
          'attach',
          {
            project_path: projectPath,
            scene_path: 'scenes/main.tscn',
            script_path: 'player.gd")\n[node name="Pwn" type="Node"]\nscript = ExtResource("x.gd',
          },
          config,
        ),
      ).rejects.toThrow('Invalid script path')
    })

    it('rejects script_path with carriage return', async () => {
      await expect(
        handleScripts(
          'attach',
          {
            project_path: projectPath,
            scene_path: 'scenes/main.tscn',
            script_path: 'player.gd\r[node name="Pwn"]',
          },
          config,
        ),
      ).rejects.toThrow('Invalid script path')
    })

    it('rejects script_path containing double quotes', async () => {
      await expect(
        handleScripts(
          'attach',
          {
            project_path: projectPath,
            scene_path: 'scenes/main.tscn',
            script_path: 'player.gd") injected="true',
          },
          config,
        ),
      ).rejects.toThrow('Invalid script path')
    })

    it('rejects node_name with newline', async () => {
      await expect(
        handleScripts(
          'attach',
          {
            project_path: projectPath,
            scene_path: 'scenes/main.tscn',
            script_path: 'player.gd',
            node_name: 'Root\n[node name="Pwn"]',
          },
          config,
        ),
      ).rejects.toThrow('Invalid node name')
    })

    it('rejects node_name containing double quotes', async () => {
      await expect(
        handleScripts(
          'attach',
          {
            project_path: projectPath,
            scene_path: 'scenes/main.tscn',
            script_path: 'player.gd',
            node_name: 'Root"]\n[node name="Pwn',
          },
          config,
        ),
      ).rejects.toThrow('Invalid node name')
    })

    it('still attaches a clean script path successfully', async () => {
      await handleScripts(
        'attach',
        {
          project_path: projectPath,
          scene_path: 'scenes/main.tscn',
          script_path: 'player.gd',
        },
        config,
      )

      const updated = readFileSync(join(projectPath, 'scenes/main.tscn'), 'utf-8')
      expect(updated).toContain('script = ExtResource("res://player.gd")')
      // Ensure no extra injected nodes
      expect(updated.match(/\[node /g)?.length).toBe(1)
    })
  })
})
