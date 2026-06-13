import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { handleProject } from '../../src/tools/composite/project.js'
import { handleConfig } from '../../src/tools/composite/config.js'
import type { GodotConfig } from '../../src/godot/types.js'

vi.mock('../../src/godot/headless.js', () => ({
  execGodotAsync: vi.fn().mockResolvedValue({ success: true, stdout: '', stderr: '', exitCode: 0 }),
  execGodotSync: vi.fn(),
  runGodotProject: vi.fn().mockReturnValue({ pid: 12345 }),
}))

describe('argument injection security', () => {
  let config: GodotConfig

  beforeEach(() => {
    config = {
      godotPath: '/path/to/godot',
      projectPath: '.',
      activePids: [],
      godotVersion: { major: 4, minor: 1, patch: 0, raw: '4.1.0' }
    } as unknown as GodotConfig
  })

  describe('Project Tool', () => {
    it('should reject preset with leading spaces and a hyphen', async () => {
      await expect(
        handleProject('export', { preset: '  --script=bad.gd', output_path: 'out.exe' }, config),
      ).rejects.toThrow('Invalid arguments')
    })

    it('should reject output_path with leading spaces and a hyphen', async () => {
      await expect(
        handleProject('export', { preset: 'Win', output_path: '  --script=bad.gd' }, config),
      ).rejects.toThrow('Invalid arguments')
    })

    it('should reject project_path with leading spaces and a hyphen', async () => {
      await expect(
        handleProject('export', { project_path: '  --arg', preset: 'Win', output_path: 'out.exe' }, config),
      ).rejects.toThrow('Invalid project path')
    })

    it('should reject scene_path with leading spaces and a hyphen', async () => {
      await expect(
        handleProject('run', { scene_path: '  --script=bad.gd' }, config),
      ).rejects.toThrow('Invalid scene path')
    })
  })

  describe('Config Tool', () => {
    it('should reject project_path with leading spaces and a hyphen', async () => {
      await expect(
        handleConfig('set', { key: 'project_path', value: '  --arg' }, config),
      ).rejects.toThrow('Invalid characters or format')
    })

    it('should reject godot_path with leading spaces and a hyphen', async () => {
      await expect(
        handleConfig('set', { key: 'godot_path', value: '  --arg' }, config),
      ).rejects.toThrow('Invalid characters or format')
    })
  })
})
