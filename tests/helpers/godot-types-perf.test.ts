import { describe, expect, it } from 'vitest'
import { parseGodotValue, toGodotValue } from '../../src/tools/helpers/godot-types.js'

describe('godot-types performance & edge cases', () => {
  it('should handle trailing commas in arrays correctly', () => {
    // Standard Godot array might have a trailing comma
    // In many languages [1,] is [1].
    // Let's see what it does now.
    expect(parseGodotValue('[1,]')).toEqual([1])
  })

  it('should handle nested structures in arrays', () => {
    const input = '[Vector2(1, 2), Color(1, 0, 0)]'
    const result = parseGodotValue(input) as unknown[]
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ x: 1, y: 2 })
    expect(result[1]).toEqual({ r: 1, g: 0, b: 0, a: 1 })
  })

  it('should handle nested arrays', () => {
    const input = '[1, [2, 3], 4]'
    expect(parseGodotValue(input)).toEqual([1, [2, 3], 4])
  })

  it('should fallback to String(value) for unknown objects in toGodotValue', () => {
    expect(toGodotValue({ some: 'other' })).toBe('[object Object]')
  })
})
