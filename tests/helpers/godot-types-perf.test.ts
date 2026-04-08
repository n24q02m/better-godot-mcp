import { describe, expect, it } from 'vitest'
import { parseGodotValue } from '../../src/tools/helpers/godot-types.js'

describe('godot-types-perf-edge-cases', () => {
  it('should handle trailing commas in arrays correctly', () => {
    expect(parseGodotValue('[1, 2, ]')).toEqual([1, 2])
  })

  it('should handle nested arrays with trailing commas', () => {
    expect(parseGodotValue('[[1, ], 2]')).toEqual([[1], 2])
  })
})
