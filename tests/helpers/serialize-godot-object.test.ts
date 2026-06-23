import { describe, expect, it } from 'vitest'
import { serializeGodotObject } from '../../src/tools/helpers/godot-types.js'

describe('serializeGodotObject', () => {
  it('should serialize a simple Godot object', () => {
    const result = serializeGodotObject('MyClass', { prop1: 1, prop2: 'value' })
    expect(result).toBe('Object(MyClass,"prop1":1,"prop2":"value")')
  })

  it('should handle nested Godot types via toGodotValue', () => {
    const result = serializeGodotObject('InputEventMouseButton', {
      position: { x: 10, y: 20 },
      pressed: true,
      factor: 1.0,
    })
    expect(result).toBe('Object(InputEventMouseButton,"position":Vector2(10, 20),"pressed":true,"factor":1)')
  })

  it('should serialize with empty properties', () => {
    const result = serializeGodotObject('EmptyClass', {})
    expect(result).toBe('Object(EmptyClass)')
  })

  it('should ignore inherited properties', () => {
    const proto = { inherited: 'yes' }
    const props = Object.create(proto)
    props.own = 'no'

    const result = serializeGodotObject('TestClass', props)
    expect(result).toBe('Object(TestClass,"own":"no")')
    expect(result).not.toContain('inherited')
  })
})
