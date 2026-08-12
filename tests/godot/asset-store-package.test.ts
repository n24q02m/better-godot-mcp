import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

const repoRoot = resolve(process.cwd())
const outputDir = mkdtempSync(join(tmpdir(), 'better-godot-mcp-asset-store-'))

afterAll(() => {
  rmSync(outputDir, { recursive: true, force: true })
})

function readZipEntries(archive: Buffer): string[] {
  const endOfCentralDirectorySignature = Buffer.from([0x50, 0x4b, 0x05, 0x06])
  const endOfCentralDirectory = archive.lastIndexOf(endOfCentralDirectorySignature)

  if (endOfCentralDirectory < 0) {
    throw new Error('Asset Store archive has no ZIP end-of-central-directory record')
  }

  const centralDirectorySize = archive.readUInt32LE(endOfCentralDirectory + 12)
  const centralDirectoryOffset = archive.readUInt32LE(endOfCentralDirectory + 16)
  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize
  const entries: string[] = []
  let cursor = centralDirectoryOffset

  while (cursor < centralDirectoryEnd) {
    if (archive.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error(`Invalid ZIP central-directory entry at offset ${cursor}`)
    }

    const fileNameLength = archive.readUInt16LE(cursor + 28)
    const extraFieldLength = archive.readUInt16LE(cursor + 30)
    const fileCommentLength = archive.readUInt16LE(cursor + 32)
    const fileNameStart = cursor + 46
    entries.push(archive.toString('utf8', fileNameStart, fileNameStart + fileNameLength))
    cursor += 46 + fileNameLength + extraFieldLength + fileCommentLength
  }

  return entries
}

describe('Godot Asset Store package', () => {
  it('builds a deterministic addon-only archive with the required package surface', () => {
    const output = join(outputDir, 'better-godot-mcp-asset-store.zip')

    execFileSync(process.execPath, ['scripts/build-godot-asset-store-package.mjs', '--output', output], {
      cwd: repoRoot,
      encoding: 'utf8',
    })

    expect(existsSync(output)).toBe(true)
    const entries = readZipEntries(readFileSync(output))

    expect(entries.length).toBeGreaterThan(0)
    const allowedDirectoryEntries = new Set(['addons/', 'addons/better_godot_mcp/'])
    expect(
      entries.every((entry) => allowedDirectoryEntries.has(entry) || entry.startsWith('addons/better_godot_mcp/')),
    ).toBe(true)

    for (const required of [
      'addons/better_godot_mcp/plugin.cfg',
      'addons/better_godot_mcp/better_godot_mcp.gd',
      'addons/better_godot_mcp/better_godot_mcp_dock.gd',
      'addons/better_godot_mcp/README.md',
      'addons/better_godot_mcp/LICENSE',
      'addons/better_godot_mcp/icon.png',
    ]) {
      expect(entries).toContain(required)
    }

    expect(entries).not.toContain('package.json')
    expect(entries).not.toContain('bun.lock')
    expect(entries.some((entry) => entry.startsWith('src/'))).toBe(false)
    expect(entries.some((entry) => entry.startsWith('.github/'))).toBe(false)
  })

  it('keeps the repository archive attribute-neutral because the command scopes its path explicitly', () => {
    const attributes = execFileSync(
      'git',
      ['check-attr', 'export-ignore', '--', 'package.json', 'addons/better_godot_mcp/plugin.cfg'],
      { cwd: repoRoot, encoding: 'utf8' },
    )

    expect(attributes).toContain('package.json: export-ignore: unspecified')
    expect(attributes).toContain('addons/better_godot_mcp/plugin.cfg: export-ignore: unspecified')
  })
})
