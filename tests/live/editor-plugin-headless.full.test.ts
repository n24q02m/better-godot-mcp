import { spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const addonSource = resolve('addons/better_godot_mcp')
const fixtureSource = resolve('tests/godot/fixtures/editor-plugin-project/project.godot')

describe('Godot EditorPlugin headless load', () => {
  it('loads the checked-in addon in a real Godot editor process', () => {
    const projectPath = mkdtempSync(join(tmpdir(), 'better-godot-mcp-editor-plugin-'))

    try {
      cpSync(fixtureSource, join(projectPath, 'project.godot'))
      cpSync(addonSource, join(projectPath, 'addons/better_godot_mcp'), { recursive: true })

      const result = spawnSync(
        process.env.GODOT_PATH ?? 'godot',
        ['--headless', '--editor', '--path', projectPath, '--quit-after', '2'],
        {
          cwd: resolve('.'),
          encoding: 'utf8',
          timeout: 30_000,
        },
      )
      const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`

      expect(result.error).toBeUndefined()
      expect(result.status).toBe(0)
      expect(output).toContain('Initializing plugins')
      expect(output).not.toMatch(/failed to load|No directory found|SCRIPT ERROR/i)
    } finally {
      rmSync(projectPath, { recursive: true, force: true })
    }
  }, 30_000)
})
