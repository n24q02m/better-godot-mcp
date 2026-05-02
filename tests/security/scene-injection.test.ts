import * as fs from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleAnimation } from '../../src/tools/composite/animation.js'
import { handleNavigation } from '../../src/tools/composite/navigation.js'
import { GodotMCPError } from '../../src/tools/helpers/errors.js'
import * as paths from '../../src/tools/helpers/paths.js'

// Mock dependencies
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}))

vi.mock('../../src/tools/helpers/paths.js', () => ({
  pathExists: vi.fn(),
  safeResolve: vi.fn((_base, target) => `/mock/path/${target}`),
}))

describe('Scene Injection Prevention', () => {
  const mockConfig = { projectPath: '/mock/project' }
  const mockScenePath = 'test.tscn'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(paths.pathExists).mockResolvedValue(true)
    vi.mocked(fs.readFile).mockResolvedValue('[node name="Root" type="Node"]\n')
  })

  describe('animation.ts', () => {
    it('should reject newlines and quotes in create_player parameters', async () => {
      const maliciousName = 'Anim"\n[node name="Injected" type="Node"]'
      const maliciousParent = 'Parent"\n[node name="Injected2" type="Node"]'

      // Test name
      await expect(
        handleAnimation('create_player', { scene_path: mockScenePath, name: maliciousName }, mockConfig),
      ).rejects.toThrow(GodotMCPError)

      // Test parent
      await expect(
        handleAnimation('create_player', { scene_path: mockScenePath, parent: maliciousParent }, mockConfig),
      ).rejects.toThrow(GodotMCPError)
    })

    it('should reject newlines and quotes in add_animation parameters', async () => {
      const maliciousAnimName = 'Walk"\n[sub_resource type="Script"]'

      await expect(
        handleAnimation('add_animation', { scene_path: mockScenePath, anim_name: maliciousAnimName }, mockConfig),
      ).rejects.toThrow(GodotMCPError)
    })

    it('should reject newlines and quotes in add_track parameters', async () => {
      const maliciousTrackType = 'value"\n[node name="Injected"]'

      // Need a valid anim_name that exists to get past initial checks,
      // but the validation happens first so we just pass all malicious args
      await expect(
        handleAnimation(
          'add_track',
          {
            scene_path: mockScenePath,
            anim_name: 'ValidAnim',
            track_type: maliciousTrackType,
            node_path: 'Sprite2D',
            property: 'position',
          },
          mockConfig,
        ),
      ).rejects.toThrow(GodotMCPError)
    })
  })

  describe('navigation.ts', () => {
    it('should reject newlines and quotes in create_region parameters', async () => {
      const maliciousName = 'Region"\n[node name="Injected" type="Node"]'
      const maliciousParent = 'Parent"\n[node name="Injected2" type="Node"]'

      // Test name
      await expect(
        handleNavigation('create_region', { scene_path: mockScenePath, name: maliciousName }, mockConfig),
      ).rejects.toThrow(GodotMCPError)

      // Test parent
      await expect(
        handleNavigation('create_region', { scene_path: mockScenePath, parent: maliciousParent }, mockConfig),
      ).rejects.toThrow(GodotMCPError)
    })

    it('should reject newlines and quotes in add_agent parameters', async () => {
      const maliciousName = 'Agent"\n[node name="Injected" type="Node"]'

      await expect(
        handleNavigation('add_agent', { scene_path: mockScenePath, name: maliciousName }, mockConfig),
      ).rejects.toThrow(GodotMCPError)
    })

    it('should reject newlines and quotes in add_obstacle parameters', async () => {
      const maliciousName = 'Obstacle"\n[node name="Injected" type="Node"]'

      await expect(
        handleNavigation('add_obstacle', { scene_path: mockScenePath, name: maliciousName }, mockConfig),
      ).rejects.toThrow(GodotMCPError)
    })
  })
})
