import { describe, expect, it } from 'vitest'
import { normalizeNodePath } from '../../src/tools/helpers/scene-parser.js'

/**
 * Unit tests for node path normalization logic.
 */
describe('normalizeNodePath', () => {
  it('should handle empty or dot path', () => {
    expect(normalizeNodePath('')).toEqual({ path: '', corrected: false })
    expect(normalizeNodePath('.')).toEqual({ path: '.', corrected: false })
  })

  it('should handle /root/SceneName/Node prefix', () => {
    expect(normalizeNodePath('/root/Main/Player')).toEqual({ path: 'Player', corrected: true })
    expect(normalizeNodePath('/root/Main/UI/Health')).toEqual({ path: 'UI/Health', corrected: true })
  })

  it('should handle /root/ prefix (referring to scene root)', () => {
    expect(normalizeNodePath('/root/Player')).toEqual({ path: '.', corrected: true })
  })

  it('should handle /root prefix', () => {
    expect(normalizeNodePath('/root')).toEqual({ path: '.', corrected: true })
  })

  it('should strip res:// prefix', () => {
    expect(normalizeNodePath('res://Player')).toEqual({ path: 'Player', corrected: true })
    expect(normalizeNodePath('res://UI/Label')).toEqual({ path: 'UI/Label', corrected: true })
  })

  it('should strip leading ./', () => {
    expect(normalizeNodePath('./Player')).toEqual({ path: 'Player', corrected: true })
    expect(normalizeNodePath('./UI/Label')).toEqual({ path: 'UI/Label', corrected: true })
  })

  it('should handle multiple prefixes', () => {
    // res://./Player -> res://Player -> Player
    expect(normalizeNodePath('res://./Player')).toEqual({ path: 'Player', corrected: true })
  })

  it('should strip leading slash', () => {
    expect(normalizeNodePath('/Sprite')).toEqual({ path: 'Sprite', corrected: true })
  })

  it('should not correct valid relative paths', () => {
    expect(normalizeNodePath('Sprite')).toEqual({ path: 'Sprite', corrected: false })
    expect(normalizeNodePath('UI/Label')).toEqual({ path: 'UI/Label', corrected: false })
  })
})
