/**
 * Integration tests for Navigation tool
 */

import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleNavigation } from '../../src/tools/composite/navigation.js'
import { createTmpProject, createTmpScene, MINIMAL_TSCN, makeConfig } from '../fixtures.js'

describe('navigation', () => {
  let projectPath: string
  let cleanup: () => void
  let config: GodotConfig

  beforeEach(() => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
    config = makeConfig({ projectPath })
  })

  afterEach(() => cleanup())

  // ==========================================
  // create_region
  // ==========================================
  describe('create_region', () => {
    it('should create NavigationRegion3D by default', async () => {
      createTmpScene(projectPath, 'nav.tscn', MINIMAL_TSCN)

      const result = await handleNavigation('create_region', { scene_path: 'nav.tscn' }, config)

      expect(result.content[0].text).toContain('NavigationRegion3D')
      const content = readFileSync(`${projectPath}/nav.tscn`, 'utf-8')
      expect(content).toContain('NavigationRegion3D')
    })

    it('should create NavigationRegion2D when dimension is 2D', async () => {
      createTmpScene(projectPath, 'nav.tscn', MINIMAL_TSCN)

      await handleNavigation('create_region', { scene_path: 'nav.tscn', dimension: '2D' }, config)

      const content = readFileSync(`${projectPath}/nav.tscn`, 'utf-8')
      expect(content).toContain('NavigationRegion2D')
    })

    it('should create region with custom parent', async () => {
      createTmpScene(projectPath, 'nav.tscn', MINIMAL_TSCN)
      await handleNavigation('create_region', { scene_path: 'nav.tscn', parent: 'MainNode' }, config)
      const content = readFileSync(`${projectPath}/nav.tscn`, 'utf-8')
      expect(content).toContain('parent="MainNode"')
    })

    it('should use absolute scene_path directly when project_path is not configured', async () => {
      createTmpScene(projectPath, 'nav.tscn', MINIMAL_TSCN)
      const absolutePath = `${projectPath}/nav.tscn`
      const emptyConfig = { projectPath: '' }
      await handleNavigation('create_region', { scene_path: absolutePath }, emptyConfig)
      const content = readFileSync(absolutePath, 'utf-8')
      expect(content).toContain('NavigationRegion3D')
    })

    it('should handle absolute scene_path gracefully', async () => {
      createTmpScene(projectPath, 'nav.tscn', MINIMAL_TSCN)
      const absolutePath = `${projectPath}/nav.tscn`
      await handleNavigation('create_region', { scene_path: absolutePath }, config)
      const content = readFileSync(absolutePath, 'utf-8')
      expect(content).toContain('NavigationRegion3D')
    })

    it('should use custom name when provided', async () => {
      createTmpScene(projectPath, 'nav.tscn', MINIMAL_TSCN)

      await handleNavigation('create_region', { scene_path: 'nav.tscn', name: 'MyRegion' }, config)

      const content = readFileSync(`${projectPath}/nav.tscn`, 'utf-8')
      expect(content).toContain('"MyRegion"')
    })

    it('should add path_desired_distance and target_desired_distance when provided', async () => {
      createTmpScene(projectPath, 'nav.tscn', MINIMAL_TSCN)
      await handleNavigation(
        'add_agent',
        { scene_path: 'nav.tscn', path_desired_distance: 1.5, target_desired_distance: 2.5 },
        config,
      )
      const content = readFileSync(`${projectPath}/nav.tscn`, 'utf-8')
      expect(content).toContain('path_desired_distance = 1.5')
      expect(content).toContain('target_desired_distance = 2.5')
    })

    it('should throw if no scene_path provided', async () => {
      await expect(handleNavigation('create_region', {}, config)).rejects.toThrow('No scene_path specified')
    })

    it('should throw if scene not found', async () => {
      await expect(handleNavigation('create_region', { scene_path: 'nonexistent.tscn' }, config)).rejects.toThrow(
        'Scene not found',
      )
    })
  })

  // ==========================================
  // add_agent
  // ==========================================
  describe('add_agent', () => {
    it('should add NavigationAgent3D by default', async () => {
      createTmpScene(projectPath, 'nav.tscn', MINIMAL_TSCN)

      const result = await handleNavigation('add_agent', { scene_path: 'nav.tscn' }, config)

      expect(result.content[0].text).toContain('NavigationAgent3D')
      const content = readFileSync(`${projectPath}/nav.tscn`, 'utf-8')
      expect(content).toContain('NavigationAgent3D')
    })

    it('should add NavigationAgent2D when dimension is 2D', async () => {
      createTmpScene(projectPath, 'nav.tscn', MINIMAL_TSCN)

      await handleNavigation('add_agent', { scene_path: 'nav.tscn', dimension: '2D' }, config)

      const content = readFileSync(`${projectPath}/nav.tscn`, 'utf-8')
      expect(content).toContain('NavigationAgent2D')
    })

    it('should add radius and max_speed properties when provided', async () => {
      createTmpScene(projectPath, 'nav.tscn', MINIMAL_TSCN)

      await handleNavigation('add_agent', { scene_path: 'nav.tscn', radius: 0.5, max_speed: 5 }, config)

      const content = readFileSync(`${projectPath}/nav.tscn`, 'utf-8')
      expect(content).toContain('radius = 0.5')
      expect(content).toContain('max_speed = 5')
    })

    it('should throw if no scene_path provided', async () => {
      await expect(handleNavigation('add_agent', {}, config)).rejects.toThrow('No scene_path specified')
    })
  })

  // ==========================================
  // add_obstacle
  // ==========================================
  describe('add_obstacle', () => {
    it('should add NavigationObstacle3D by default', async () => {
      createTmpScene(projectPath, 'nav.tscn', MINIMAL_TSCN)

      const result = await handleNavigation('add_obstacle', { scene_path: 'nav.tscn' }, config)

      expect(result.content[0].text).toContain('NavigationObstacle3D')
      const content = readFileSync(`${projectPath}/nav.tscn`, 'utf-8')
      expect(content).toContain('NavigationObstacle3D')
    })

    it('should add NavigationObstacle2D when dimension is 2D', async () => {
      createTmpScene(projectPath, 'nav.tscn', MINIMAL_TSCN)

      await handleNavigation('add_obstacle', { scene_path: 'nav.tscn', dimension: '2D' }, config)

      const content = readFileSync(`${projectPath}/nav.tscn`, 'utf-8')
      expect(content).toContain('NavigationObstacle2D')
    })

    it('should add radius when provided', async () => {
      createTmpScene(projectPath, 'nav.tscn', MINIMAL_TSCN)
      await handleNavigation('add_obstacle', { scene_path: 'nav.tscn', radius: 1.2 }, config)
      const content = readFileSync(`${projectPath}/nav.tscn`, 'utf-8')
      expect(content).toContain('radius = 1.2')
    })

    it('should add avoidance_enabled when set to true', async () => {
      createTmpScene(projectPath, 'nav.tscn', MINIMAL_TSCN)

      await handleNavigation('add_obstacle', { scene_path: 'nav.tscn', avoidance_enabled: true }, config)

      const content = readFileSync(`${projectPath}/nav.tscn`, 'utf-8')
      expect(content).toContain('avoidance_enabled = true')
    })

    it('should throw if no scene_path provided', async () => {
      await expect(handleNavigation('add_obstacle', {}, config)).rejects.toThrow('No scene_path specified')
    })
  })

  // ==========================================
  // errors
  // ==========================================
  it('should throw for unknown action', async () => {
    await expect(handleNavigation('unknown', {}, config)).rejects.toThrow('Unknown action')
  })
})
