import { describe, expect, it } from 'vitest'
// We need to export normalizeNodePath or import it if it was exported.
// Currently it is not exported. I will need to export it to test it properly,
// or I can test it through handleNodes, but unit tests are better.
// For now, I will use a trick to test it if I can't export it easily,
// but the best way is to modify nodes.ts to export it.

// Wait, I can't import it if it's not exported.
// I'll check if I should export it. The plan says "Implement the improved normalizeNodePath".
// I'll modify src/tools/composite/nodes.ts to export it first.
import { normalizeNodePath } from '../../src/tools/composite/nodes.js'

describe('normalizeNodePath comprehensive', () => {
  it('should handle basic paths', () => {
    expect(normalizeNodePath('Player').path).toBe('Player')
    expect(normalizeNodePath('Main/Player').path).toBe('Main/Player')
    expect(normalizeNodePath('.').path).toBe('.')
  })

  it('should normalize backslashes', () => {
    const res = normalizeNodePath('Main\\Player')
    expect(res.path).toBe('Main/Player')
    expect(res.corrected).toBe(true)
  })

  it('should strip /root/ and root/ prefix', () => {
    expect(normalizeNodePath('/root/Main/Player').path).toBe('Player')
    expect(normalizeNodePath('root/Main/Player').path).toBe('Player')
    expect(normalizeNodePath('/root/Main').path).toBe('.')
    expect(normalizeNodePath('root/Main').path).toBe('.')
    expect(normalizeNodePath('/root').path).toBe('.')
  })

  it('should strip leading slashes', () => {
    expect(normalizeNodePath('/Player').path).toBe('Player')
    expect(normalizeNodePath('//Player').path).toBe('Player')
  })

  it('should handle res:// and user:// mistakes', () => {
    expect(normalizeNodePath('res://Main/Player').path).toBe('Main/Player')
    expect(normalizeNodePath('user://Saves/Player').path).toBe('Saves/Player')
  })

  it('should strip GDScript accessor $', () => {
    expect(normalizeNodePath('$Main/Player').path).toBe('Main/Player')
    expect(normalizeNodePath('$"Main/Player"').path).toBe('Main/Player')
  })

  it('should strip NodePath wrappers', () => {
    expect(normalizeNodePath('NodePath("Main/Player")').path).toBe('Main/Player')
    expect(normalizeNodePath('^"Main/Player"').path).toBe('Main/Player')
  })

  it('should strip ./ prefix', () => {
    expect(normalizeNodePath('./Player').path).toBe('Player')
    expect(normalizeNodePath('./Main/Player').path).toBe('Main/Player')
  })

  it('should collapse multiple slashes', () => {
    expect(normalizeNodePath('Main///Player').path).toBe('Main/Player')
  })

  it('should handle mixed cases', () => {
    expect(normalizeNodePath('res://root/Main/Player/').path).toBe('Player')
    expect(normalizeNodePath('NodePath("/root/Main/Child")').path).toBe('Child')
  })
})
