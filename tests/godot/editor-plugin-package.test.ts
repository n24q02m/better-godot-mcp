import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const addonDir = resolve(process.cwd(), 'addons/better_godot_mcp')
const assetStoreMediaDir = resolve(process.cwd(), 'media/godot-asset-store')

function readAddonFile(name: string): string {
  return readFileSync(resolve(addonDir, name), 'utf8')
}

function readPngDimensions(directory: string, name: string): { width: number; height: number } {
  const png = readFileSync(resolve(directory, name))
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  if (!png.subarray(0, signature.length).equals(signature) || png.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error(`${name} is not a PNG with an IHDR chunk`)
  }

  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) }
}

describe('Godot EditorPlugin package', () => {
  it('contains the minimum official plugin package surface', () => {
    const manifest = readAddonFile('plugin.cfg')
    const license = readAddonFile('LICENSE')

    expect(existsSync(resolve(process.cwd(), '.gitignore'))).toBe(true)

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

    expect(license).toContain('Apache License')
    expect(license).toContain('Copyright 2026 n24q02m')
    const icon = readPngDimensions(addonDir, 'icon.png')
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
    expect(readme).toContain('Asset Store')
    expect(readme).toContain('Asset Library')
    expect(readme).toContain('package:godot-asset-store')
    expect(readme).toContain('icon.png')
    expect(readme).toContain('LICENSE')
    expect(readme).toContain('no auth')
    expect(readme).toContain('Godot 4.7.1')
  })

  it('provides upload-ready 16:9 Asset Store media outside the addon archive', () => {
    expect(existsSync(resolve(assetStoreMediaDir, '.gdignore'))).toBe(true)

    for (const file of ['thumbnail.png', 'screenshot-project-info.png']) {
      const image = readPngDimensions(assetStoreMediaDir, file)
      expect(image.width).toBeGreaterThanOrEqual(1280)
      expect(image.height).toBeGreaterThanOrEqual(720)
      expect(image.width * 9).toBe(image.height * 16)
    }

    const guide = readFileSync(resolve(assetStoreMediaDir, 'README.md'), 'utf8')
    expect(guide).toContain('thumbnail.png')
    expect(guide).toContain('screenshot-project-info.png')
    expect(guide).toContain('1280x720')
    expect(guide).toContain('Media')
  })
})
