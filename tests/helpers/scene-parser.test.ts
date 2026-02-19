/**
 * Tests for .tscn scene parser and manipulation functions
 */

import { describe, expect, it } from 'vitest'
import {
  findNode,
  getNodePath,
  getNodeProperty,
  parseSceneContent,
  removeNodeFromContent,
  renameNodeInContent,
  setNodePropertyInContent,
} from '../../src/tools/helpers/scene-parser.js'
import { COMPLEX_TSCN, MINIMAL_TSCN, SCENE_WITH_GROUPS } from '../fixtures.js'

describe('scene-parser', () => {
  // ==========================================
  // parseSceneContent
  // ==========================================
  describe('parseSceneContent', () => {
    it('should parse minimal scene header', () => {
      const scene = parseSceneContent(MINIMAL_TSCN)
      expect(scene.header.format).toBe(3)
      expect(scene.header.loadSteps).toBe(1)
      expect(scene.header.uid).toBeUndefined()
    })

    it('should parse complex scene header with uid', () => {
      const scene = parseSceneContent(COMPLEX_TSCN)
      expect(scene.header.format).toBe(3)
      expect(scene.header.loadSteps).toBe(4)
      expect(scene.header.uid).toBe('uid://abc123')
    })

    it('should parse ext_resources', () => {
      const scene = parseSceneContent(COMPLEX_TSCN)
      expect(scene.extResources).toHaveLength(2)
      expect(scene.extResources[0].type).toBe('Script')
      expect(scene.extResources[0].uid).toBe('uid://def456')
      expect(scene.extResources[0].path).toBe('res://player.gd')
      expect(scene.extResources[0].id).toBe('1_abc')
      expect(scene.extResources[1].type).toBe('Texture2D')
      expect(scene.extResources[1].id).toBe('2_def')
    })

    it('should parse sub_resources with properties', () => {
      const scene = parseSceneContent(COMPLEX_TSCN)
      expect(scene.subResources).toHaveLength(2)
      expect(scene.subResources[0]).toEqual({
        type: 'RectangleShape2D',
        id: 'RectangleShape2D_abc',
        properties: { size: 'Vector2(32, 32)' },
      })
      expect(scene.subResources[1].properties.radius).toBe('16.0')
    })

    it('should parse nodes', () => {
      const scene = parseSceneContent(COMPLEX_TSCN)
      // Player, Sprite, CollisionShape, Camera, UI, Label = 6 nodes
      expect(scene.nodes).toHaveLength(6)
    })

    it('should parse root node (no parent)', () => {
      const scene = parseSceneContent(COMPLEX_TSCN)
      const root = scene.nodes[0]
      expect(root.name).toBe('Player')
      expect(root.type).toBe('CharacterBody2D')
      expect(root.parent).toBeUndefined()
    })

    it('should parse child nodes with parent', () => {
      const scene = parseSceneContent(COMPLEX_TSCN)
      const sprite = scene.nodes.find((n) => n.name === 'Sprite')
      expect(sprite?.parent).toBe('.')
      expect(sprite?.type).toBe('Sprite2D')
    })

    it('should parse nested parent paths', () => {
      const scene = parseSceneContent(COMPLEX_TSCN)
      const label = scene.nodes.find((n) => n.name === 'Label')
      expect(label?.parent).toBe('UI')
      expect(label?.type).toBe('Label')
    })

    it('should parse node properties', () => {
      const scene = parseSceneContent(COMPLEX_TSCN)
      const root = scene.nodes[0]
      expect(root.properties.position).toBe('Vector2(100, 200)')
      expect(root.properties.speed).toBe('300')
    })

    it('should parse connections', () => {
      const scene = parseSceneContent(COMPLEX_TSCN)
      expect(scene.connections).toHaveLength(2)
      expect(scene.connections[0]).toEqual({
        signal: 'body_entered',
        from: 'Player',
        to: 'Player',
        method: '_on_body_entered',
        flags: undefined,
      })
    })

    it('should parse connection with flags', () => {
      const scene = parseSceneContent(COMPLEX_TSCN)
      expect(scene.connections[1].flags).toBe(1)
    })

    it('should parse node groups', () => {
      const scene = parseSceneContent(SCENE_WITH_GROUPS)
      const enemy = scene.nodes.find((n) => n.name === 'Enemy')
      expect(enemy?.groups).toEqual(['enemies', 'damageable'])
    })

    it('should skip comments and blank lines', () => {
      const content = `; This is a comment
[gd_scene format=3]

; Another comment
[node name="Root" type="Node"]
`
      const scene = parseSceneContent(content)
      expect(scene.nodes).toHaveLength(1)
      expect(scene.nodes[0].name).toBe('Root')
    })

    it('should preserve raw content', () => {
      const scene = parseSceneContent(MINIMAL_TSCN)
      expect(scene.raw).toBe(MINIMAL_TSCN)
    })

    it('should handle empty content', () => {
      const scene = parseSceneContent('')
      expect(scene.nodes).toHaveLength(0)
      expect(scene.connections).toHaveLength(0)
      expect(scene.extResources).toHaveLength(0)
    })
  })

  // ==========================================
  // findNode
  // ==========================================
  describe('findNode', () => {
    it('should find existing node by name', () => {
      const scene = parseSceneContent(COMPLEX_TSCN)
      const node = findNode(scene, 'Sprite')
      expect(node).toBeDefined()
      expect(node?.type).toBe('Sprite2D')
    })

    it('should return undefined for missing node', () => {
      const scene = parseSceneContent(COMPLEX_TSCN)
      expect(findNode(scene, 'NonExistent')).toBeUndefined()
    })
  })

  // ==========================================
  // getNodePath
  // ==========================================
  describe('getNodePath', () => {
    it('should return name for root node (no parent)', () => {
      const scene = parseSceneContent(COMPLEX_TSCN)
      const root = scene.nodes[0]
      expect(getNodePath(scene, root)).toBe('Player')
    })

    it('should return name for direct child (parent=".")', () => {
      const scene = parseSceneContent(COMPLEX_TSCN)
      const sprite = scene.nodes.find((n) => n.name === 'Sprite')
      expect(sprite).toBeDefined()
      expect(getNodePath(scene, sprite!)).toBe('Sprite')
    })

    it('should return full path for nested node', () => {
      const scene = parseSceneContent(COMPLEX_TSCN)
      const label = scene.nodes.find((n) => n.name === 'Label')
      expect(label).toBeDefined()
      expect(getNodePath(scene, label!)).toBe('UI/Label')
    })
  })

  // ==========================================
  // removeNodeFromContent
  // ==========================================
  describe('removeNodeFromContent', () => {
    it('should remove a node and its properties', () => {
      const result = removeNodeFromContent(COMPLEX_TSCN, 'Camera')
      expect(result).not.toContain('[node name="Camera"')
      // Other nodes should remain
      expect(result).toContain('[node name="Player"')
      expect(result).toContain('[node name="Sprite"')
    })

    it('should also remove connections from the removed node', () => {
      const result = removeNodeFromContent(COMPLEX_TSCN, 'Player')
      expect(result).not.toContain('from="Player"')
      expect(result).not.toContain('to="Player"')
    })

    it('should preserve unrelated content', () => {
      const result = removeNodeFromContent(COMPLEX_TSCN, 'Camera')
      expect(result).toContain('[gd_scene')
      expect(result).toContain('[ext_resource')
      expect(result).toContain('[connection signal="body_entered"')
    })

    it('should handle removing node that does not exist (no-op)', () => {
      const result = removeNodeFromContent(MINIMAL_TSCN, 'NonExistent')
      expect(result).toContain('[node name="Root"')
    })
  })

  // ==========================================
  // renameNodeInContent
  // ==========================================
  describe('renameNodeInContent', () => {
    it('should rename node declaration', () => {
      const result = renameNodeInContent(COMPLEX_TSCN, 'Sprite', 'PlayerSprite')
      expect(result).toContain('name="PlayerSprite"')
      expect(result).not.toContain('name="Sprite"')
    })

    it('should update parent references', () => {
      const result = renameNodeInContent(COMPLEX_TSCN, 'UI', 'HUD')
      // Label's parent should change from "UI" to "HUD"
      expect(result).toContain('parent="HUD"')
      expect(result).not.toContain('parent="UI"')
    })

    it('should update connection from/to references', () => {
      const result = renameNodeInContent(COMPLEX_TSCN, 'Player', 'Hero')
      expect(result).toContain('from="Hero"')
      expect(result).toContain('to="Hero"')
    })
  })

  // ==========================================
  // setNodePropertyInContent
  // ==========================================
  describe('setNodePropertyInContent', () => {
    it('should add a new property to a node', () => {
      const result = setNodePropertyInContent(MINIMAL_TSCN, 'Root', 'visible', 'false')
      expect(result).toContain('visible = false')
    })

    it('should replace an existing property', () => {
      const result = setNodePropertyInContent(COMPLEX_TSCN, 'Player', 'speed', '500')
      expect(result).toContain('speed = 500')
      // Should not have the old value
      const matches = result.match(/speed = /g)
      expect(matches).toHaveLength(1)
    })

    it('should add property to last node in file', () => {
      const result = setNodePropertyInContent(COMPLEX_TSCN, 'Label', 'visible', 'true')
      expect(result).toContain('visible = true')
    })
  })

  // ==========================================
  // getNodeProperty
  // ==========================================
  describe('getNodeProperty', () => {
    it('should get existing property value', () => {
      const scene = parseSceneContent(COMPLEX_TSCN)
      expect(getNodeProperty(scene, 'Player', 'speed')).toBe('300')
    })

    it('should return undefined for missing property', () => {
      const scene = parseSceneContent(COMPLEX_TSCN)
      expect(getNodeProperty(scene, 'Player', 'nonexistent')).toBeUndefined()
    })

    it('should return undefined for missing node', () => {
      const scene = parseSceneContent(COMPLEX_TSCN)
      expect(getNodeProperty(scene, 'Ghost', 'speed')).toBeUndefined()
    })
  })
})
