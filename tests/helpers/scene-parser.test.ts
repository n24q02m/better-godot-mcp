import { describe, expect, it } from 'vitest'
import { normalizeNodePath } from '../../src/tools/helpers/scene-parser.js'

describe('normalizeNodePath', () => {
  it('should return the same path for simple names', () => {
    expect(normalizeNodePath('Player')).toEqual({ path: 'Player', corrected: false })
    expect(normalizeNodePath('Sprite2D')).toEqual({ path: 'Sprite2D', corrected: false })
  })

  it('should return "." for empty or dot paths', () => {
    expect(normalizeNodePath('')).toEqual({ path: '', corrected: false })
    expect(normalizeNodePath('.')).toEqual({ path: '.', corrected: false })
  })

  it('should strip "res://" prefix', () => {
    expect(normalizeNodePath('res://Player')).toEqual({ path: 'Player', corrected: true })
    expect(normalizeNodePath('res://UI/Button')).toEqual({ path: 'UI/Button', corrected: true })
  })

  it('should strip "./" prefix', () => {
    expect(normalizeNodePath('./Sprite')).toEqual({ path: 'Sprite', corrected: true })
    expect(normalizeNodePath('./Map/TileMap')).toEqual({ path: 'Map/TileMap', corrected: true })
  })

  it('should recursively strip prefixes', () => {
    expect(normalizeNodePath('res://./Player')).toEqual({ path: 'Player', corrected: true })
    expect(normalizeNodePath('./res://Sprite')).toEqual({ path: 'Sprite', corrected: true })
    expect(normalizeNodePath('././res://res://UI')).toEqual({ path: 'UI', corrected: true })
  })

  it('should handle /root absolute references', () => {
    expect(normalizeNodePath('/root')).toEqual({ path: '.', corrected: true })
    expect(normalizeNodePath('/root/')).toEqual({ path: '.', corrected: true })
    expect(normalizeNodePath('/root/MainScene')).toEqual({ path: '.', corrected: true })
    expect(normalizeNodePath('/root/MainScene/')).toEqual({ path: '.', corrected: true })
    expect(normalizeNodePath('/root/MainScene/Player')).toEqual({ path: 'Player', corrected: true })
    expect(normalizeNodePath('/root/Game/Level1/Camera')).toEqual({ path: 'Level1/Camera', corrected: true })
  })

  it('should strip leading slash', () => {
    expect(normalizeNodePath('/Sprite')).toEqual({ path: 'Sprite', corrected: true })
    expect(normalizeNodePath('/UI/Label')).toEqual({ path: 'UI/Label', corrected: true })
  })

  it('should handle complex combinations', () => {
    expect(normalizeNodePath('res://./root/Main/Player')).toEqual({ path: 'Player', corrected: true })
    expect(normalizeNodePath('./res:///UI/Button')).toEqual({ path: 'UI/Button', corrected: true })
  })
})
