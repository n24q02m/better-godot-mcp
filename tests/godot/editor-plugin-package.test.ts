import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const addonDir = resolve(process.cwd(), 'addons/better_godot_mcp')

function readAddonFile(name: string): string {
  return readFileSync(resolve(addonDir, name), 'utf8')
}

describe('Godot EditorPlugin package', () => {
  it('contains the minimum official plugin package surface', () => {
    const manifest = readAddonFile('plugin.cfg')

    expect(manifest).toContain('[plugin]')
    expect(manifest).toContain('name="Better Godot MCP"')
    expect(manifest).toContain('script="better_godot_mcp.gd"')
    expect(manifest).toContain('icon="icon.svg"')

    for (const file of ['better_godot_mcp.gd', 'better_godot_mcp_dock.gd', 'README.md', 'icon.svg']) {
      expect(() => readAddonFile(file)).not.toThrow()
    }
  })

  it('implements a real local MCP client contract in the dock', () => {
    const dock = readAddonFile('better_godot_mcp_dock.gd')

    expect(dock).toContain('@tool')
    expect(dock).toContain('initialize')
    expect(dock).toContain('notifications/initialized')
    expect(dock).toContain('tools/call')
    expect(dock).toContain('project')
    expect(dock).toContain('scenes')
    expect(dock).toContain('Mcp-Session-Id')
    expect(dock).toContain('text/event-stream')
    expect(dock).toContain('127.0.0.1')
    expect(dock).toContain('MCP error')
    expect(dock).toContain('authority.contains("@")')
    expect(dock).toContain('_is_valid_port')
  })

  it('documents the explicit local-server and publication boundaries', () => {
    const readme = readAddonFile('README.md')

    expect(readme).toContain('127.0.0.1')
    expect(readme).toContain('npx')
    expect(readme).toContain('Asset Library')
    expect(readme).toContain('no auth')
    expect(readme).toContain('Godot 4.7.1')
  })
})
