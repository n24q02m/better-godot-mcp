/**
 * Tests for Godot type parsing and serialization
 */

import { describe, expect, it } from 'vitest'
import type { GodotColor, Rect2, Vector2, Vector3 } from '../../src/tools/helpers/godot-types.js'
import { parseGodotValue, toGodotValue } from '../../src/tools/helpers/godot-types.js'

describe('godot-types', () => {
  // ==========================================
  // parseGodotValue
  // ==========================================
  describe('parseGodotValue', () => {
    // Primitives
    it('should parse boolean true', () => {
      expect(parseGodotValue('true')).toBe(true)
    })

    it('should parse boolean false', () => {
      expect(parseGodotValue('false')).toBe(false)
    })

    it('should parse null', () => {
      expect(parseGodotValue('null')).toBeNull()
    })

    it('should parse integer', () => {
      expect(parseGodotValue('42')).toBe(42)
    })

    it('should parse negative integer', () => {
      expect(parseGodotValue('-7')).toBe(-7)
    })

    it('should parse float', () => {
      expect(parseGodotValue('3.14')).toBeCloseTo(3.14)
    })

    it('should parse negative float', () => {
      expect(parseGodotValue('-0.5')).toBeCloseTo(-0.5)
    })

    // Strings
    it('should parse double-quoted string', () => {
      expect(parseGodotValue('"hello world"')).toBe('hello world')
    })

    it('should parse single-quoted string', () => {
      expect(parseGodotValue("'test'")).toBe('test')
    })

    it('should parse empty string', () => {
      expect(parseGodotValue('""')).toBe('')
    })

    // Vector2
    it('should parse Vector2', () => {
      const v = parseGodotValue('Vector2(10, 20)') as Vector2
      expect(v.x).toBe(10)
      expect(v.y).toBe(20)
    })

    it('should parse Vector2 with negative values', () => {
      const v = parseGodotValue('Vector2(-5.5, -10.3)') as Vector2
      expect(v.x).toBeCloseTo(-5.5)
      expect(v.y).toBeCloseTo(-10.3)
    })

    it('should parse Vector2 with spaces', () => {
      const v = parseGodotValue('Vector2( 1 , 2 )') as Vector2
      expect(v.x).toBe(1)
      expect(v.y).toBe(2)
    })

    // Vector2i
    it('should parse Vector2i', () => {
      const v = parseGodotValue('Vector2i(3, 4)') as Vector2
      expect(v.x).toBe(3)
      expect(v.y).toBe(4)
    })

    // Vector3
    it('should parse Vector3', () => {
      const v = parseGodotValue('Vector3(1, 2, 3)') as Vector3
      expect(v.x).toBe(1)
      expect(v.y).toBe(2)
      expect(v.z).toBe(3)
    })

    it('should parse Vector3 with floats', () => {
      const v = parseGodotValue('Vector3(1.5, -2.5, 0.0)') as Vector3
      expect(v.x).toBeCloseTo(1.5)
      expect(v.y).toBeCloseTo(-2.5)
      expect(v.z).toBeCloseTo(0.0)
    })

    // Color
    it('should parse Color with 4 args', () => {
      const c = parseGodotValue('Color(1.0, 0.5, 0.0, 0.8)') as GodotColor
      expect(c.r).toBeCloseTo(1.0)
      expect(c.g).toBeCloseTo(0.5)
      expect(c.b).toBeCloseTo(0.0)
      expect(c.a).toBeCloseTo(0.8)
    })

    it('should parse Color with 3 args (alpha defaults to 1.0)', () => {
      const c = parseGodotValue('Color(0.2, 0.3, 0.4)') as GodotColor
      expect(c.r).toBeCloseTo(0.2)
      expect(c.g).toBeCloseTo(0.3)
      expect(c.b).toBeCloseTo(0.4)
      expect(c.a).toBeCloseTo(1.0)
    })

    // Rect2
    it('should parse Rect2', () => {
      const r = parseGodotValue('Rect2(0, 0, 100, 50)') as Rect2
      expect(r.x).toBe(0)
      expect(r.y).toBe(0)
      expect(r.w).toBe(100)
      expect(r.h).toBe(50)
    })

    // NodePath
    it('should parse NodePath', () => {
      expect(parseGodotValue('NodePath("Player/Sprite")')).toBe('Player/Sprite')
    })

    it('should parse empty NodePath', () => {
      expect(parseGodotValue('NodePath("")')).toBe('')
    })

    // Resource references
    it('should parse ExtResource', () => {
      expect(parseGodotValue('ExtResource("1_abc")')).toBe('ExtResource("1_abc")')
    })

    it('should parse SubResource', () => {
      expect(parseGodotValue('SubResource("Shape_123")')).toBe('SubResource("Shape_123")')
    })

    // Arrays
    it('should parse empty array', () => {
      expect(parseGodotValue('[]')).toEqual([])
    })

    it('should parse array of numbers', () => {
      expect(parseGodotValue('[1, 2, 3]')).toEqual([1, 2, 3])
    })

    it('should parse array of strings', () => {
      expect(parseGodotValue('["a", "b"]')).toEqual(['a', 'b'])
    })

    // Edge cases
    it('should handle leading/trailing whitespace', () => {
      expect(parseGodotValue('  42  ')).toBe(42)
    })

    it('should return unrecognized values as-is', () => {
      expect(parseGodotValue('SomeUnknownType()')).toBe('SomeUnknownType()')
    })
  })

  // ==========================================
  // toGodotValue
  // ==========================================
  describe('toGodotValue', () => {
    it('should serialize null', () => {
      expect(toGodotValue(null)).toBe('null')
    })

    it('should serialize true', () => {
      expect(toGodotValue(true)).toBe('true')
    })

    it('should serialize false', () => {
      expect(toGodotValue(false)).toBe('false')
    })

    it('should serialize integer', () => {
      expect(toGodotValue(42)).toBe('42')
    })

    it('should serialize float', () => {
      expect(toGodotValue(3.14)).toBe('3.14')
    })

    it('should serialize string with quotes', () => {
      expect(toGodotValue('hello')).toBe('"hello"')
    })

    it('should serialize Vector2', () => {
      expect(toGodotValue({ x: 10, y: 20 })).toBe('Vector2(10, 20)')
    })

    it('should serialize Vector3', () => {
      expect(toGodotValue({ x: 1, y: 2, z: 3 })).toBe('Vector3(1, 2, 3)')
    })

    it('should serialize Color', () => {
      expect(toGodotValue({ r: 1, g: 0.5, b: 0, a: 0.8 })).toBe('Color(1, 0.5, 0, 0.8)')
    })

    it('should serialize Color with default alpha', () => {
      expect(toGodotValue({ r: 1, g: 0, b: 0 })).toBe('Color(1, 0, 0, 1)')
    })

    it('should serialize Rect2 from object with x,y,w,h', () => {
      expect(toGodotValue({ x: 0, y: 0, w: 100, h: 50 })).toBe('Rect2(0, 0, 100, 50)')
    })

    it('should serialize array', () => {
      expect(toGodotValue([1, 2, 3])).toBe('[1, 2, 3]')
    })

    it('should serialize empty array', () => {
      expect(toGodotValue([])).toBe('[]')
    })

    it('should serialize mixed array', () => {
      expect(toGodotValue([1, 'test', true])).toBe('[1, "test", true]')
    })
  })

  // ==========================================
  // Roundtrip tests
  // ==========================================
  describe('roundtrip parse -> serialize', () => {
    it('should roundtrip Vector2', () => {
      const original = 'Vector2(10, 20)'
      const parsed = parseGodotValue(original)
      expect(toGodotValue(parsed)).toBe(original)
    })

    it('should roundtrip Vector3', () => {
      const original = 'Vector3(1, 2, 3)'
      const parsed = parseGodotValue(original)
      expect(toGodotValue(parsed)).toBe(original)
    })

    it('should roundtrip boolean', () => {
      expect(toGodotValue(parseGodotValue('true'))).toBe('true')
      expect(toGodotValue(parseGodotValue('false'))).toBe('false')
    })

    it('should roundtrip null', () => {
      expect(toGodotValue(parseGodotValue('null'))).toBe('null')
    })

    it('should roundtrip number', () => {
      expect(toGodotValue(parseGodotValue('42'))).toBe('42')
    })
  })
})
