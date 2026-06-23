import { describe, expect, it } from 'vitest'
import { parseGodotValue, toGodotValue } from '../../src/tools/helpers/godot-types.js'

describe('godot-types extra coverage', () => {
  describe('parseGodotValue extra', () => {
    it('should handle spaces in empty array', () => {
      expect(parseGodotValue('[   ]')).toEqual([])
    })

    it('should return strings starting with V/C/R but not matching types as-is', () => {
      expect(parseGodotValue('Value')).toBe('Value')
      expect(parseGodotValue('Colorless')).toBe('Colorless')
      expect(parseGodotValue('Rectangular')).toBe('Rectangular')
    })

    it('should handle malformed structural types', () => {
      expect(parseGodotValue('Vector2(1)')).toBe('Vector2(1)')
      expect(parseGodotValue('Vector2i(1.5, 2)')).toBe('Vector2i(1.5, 2)')
      expect(parseGodotValue('Vector3(1, 2)')).toBe('Vector3(1, 2)')
      expect(parseGodotValue('Color(1, 2)')).toBe('Color(1, 2)')
      expect(parseGodotValue('Rect2(1, 2, 3)')).toBe('Rect2(1, 2, 3)')
    })

    it('should handle arrays with multiple commas or trailing commas', () => {
      // Current behavior results in empty strings for missing items
      expect(parseGodotValue('[1, , 2]')).toEqual([1, '', 2])
      expect(parseGodotValue('[1, ]')).toEqual([1, ''])
    })

    it('should handle whitespace around items in arrays', () => {
      expect(parseGodotValue('[ 1 , 2 ]')).toEqual([1, 2])
    })

    it('should handle nested structural types in arrays to cover parenLevel', () => {
      expect(parseGodotValue('[Vector2(1, 2), Color(1, 1, 1)]')).toEqual([
        { x: 1, y: 2 },
        { r: 1, g: 1, b: 1, a: 1 },
      ])
    })

    it('should handle complex nested arrays to cover bracketLevel', () => {
      expect(parseGodotValue('[ [1, 2], [3, 4] ]')).toEqual([
        [1, 2],
        [3, 4],
      ])
    })

    it('should cover the item filter branch in arrays', () => {
      // Line 178: if (item || results.length > 0 || i < inner.length)
      // This is hard to hit the false branch because of how the loop works,
      // but let's try to hit more of it.
      expect(parseGodotValue('[,]')).toEqual(['', ''])
    })
  })

  describe('toGodotValue extra', () => {
    it('should fallback to string for undefined', () => {
      expect(toGodotValue(undefined)).toBe('undefined')
    })

    it('should prioritize Rect2 over Vector3/Vector2', () => {
      const obj = { x: 1, y: 2, z: 3, w: 4, h: 5 }
      expect(toGodotValue(obj)).toBe('Rect2(1, 2, 4, 5)')
    })

    it('should prioritize Vector3 over Vector2', () => {
      const obj = { x: 1, y: 2, z: 3 }
      expect(toGodotValue(obj)).toBe('Vector3(1, 2, 3)')
    })

    it('should handle non-numeric object properties', () => {
      // @ts-expect-error - testing invalid types
      expect(toGodotValue({ x: 'a', y: 'b' })).toBe('Vector2(a, b)')
    })
  })
})
