import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const addonDir = resolve(process.cwd(), 'addons/better_godot_mcp')

function readAddonFile(name: string): string {
  return readFileSync(resolve(addonDir, name), 'utf8')
}

function readPngDimensions(name: string): { width: number; height: number } {
  const png = readFileSync(resolve(addonDir, name))
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  if (!png.subarray(0, signature.length).equals(signature) || png.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error(`${name} is not a PNG with an IHDR chunk`)
  }

  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) }
}

describe('Godot EditorPlugin package', () => {
  it('contains the minimum official plugin package surface', () => {
    const manifest = readAddonFile('plugin.cfg')

    expect(manifest).toContain('[plugin]')
    expect(manifest).toContain('name="Better Godot MCP"')
    expect(manifest).toContain('script="better_godot_mcp.gd"')
    expect(manifest).toContain('icon="icon.png"')

    for (const file of [
      'better_godot_mcp.gd',
      'better_godot_mcp_dock.gd',
      'README.md',
      'LICENSE',
      'icon.svg',
      'icon.png',
    ]) {
      expect(() => readAddonFile(file)).not.toThrow()
    }

    expect(readAddonFile('LICENSE')).toContain('Apache License')
    const icon = readPngDimensions('icon.png')
    expect(icon.width).toBeGreaterThanOrEqual(128)
    expect(icon.height).toBeGreaterThanOrEqual(128)
    expect(icon.width).toBe(icon.height)
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
    expect(readme).toContain('icon.png')
    expect(readme).toContain('LICENSE')
    expect(readme).toContain('no auth')
    expect(readme).toContain('Godot 4.7.1')
  })
})
