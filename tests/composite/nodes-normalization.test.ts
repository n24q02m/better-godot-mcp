import { describe, expect, it } from 'vitest'
import { normalizeNodePath } from '../../src/tools/composite/nodes.js'

describe('normalizeNodePath', () => {
  it('should handle basic paths', () => {
    expect(normalizeNodePath('Player/Head')).toEqual({ path: 'Player/Head', corrected: false })
    expect(normalizeNodePath('.')).toEqual({ path: '.', corrected: false })
  })

  it('should normalize backslashes', () => {
    expect(normalizeNodePath('Player\\Head')).toEqual({ path: 'Player/Head', corrected: true })
  })

  it('should strip leading slashes (except /root)', () => {
    expect(normalizeNodePath('/Player/Head')).toEqual({ path: 'Player/Head', corrected: true })
  })

  it('should handle /root/ prefixes (absolute paths from LLMs)', () => {
    expect(normalizeNodePath('/root/World/Player')).toEqual({ path: 'Player', corrected: true })
    expect(normalizeNodePath('root/World/Player')).toEqual({ path: 'Player', corrected: true })
    expect(normalizeNodePath('/ROOT/World/Player')).toEqual({ path: 'Player', corrected: true })
  })

  it('should handle /root as current scene root', () => {
    expect(normalizeNodePath('/root')).toEqual({ path: '.', corrected: true })
    expect(normalizeNodePath('/ROOT')).toEqual({ path: '.', corrected: true })
    expect(normalizeNodePath('/root/World')).toEqual({ path: '.', corrected: true })
    expect(normalizeNodePath('root/World')).toEqual({ path: '.', corrected: true })
  })

  it('should preserve standalone node names like Root or root', () => {
    expect(normalizeNodePath('Root')).toEqual({ path: 'Root', corrected: false })
    expect(normalizeNodePath('root')).toEqual({ path: 'root', corrected: false })
  })

  it('should unwrap NodePath("...")', () => {
    expect(normalizeNodePath('NodePath("Player/Head")')).toEqual({ path: 'Player/Head', corrected: true })
  })

  it('should unwrap ^"..." and $"..."', () => {
    expect(normalizeNodePath('^"Player/Head"')).toEqual({ path: 'Player/Head', corrected: true })
    expect(normalizeNodePath('$"Player/Head"')).toEqual({ path: 'Player/Head', corrected: true })
  })

  it('should strip Godot markers ^ and $', () => {
    expect(normalizeNodePath('^Player/Head')).toEqual({ path: 'Player/Head', corrected: true })
    expect(normalizeNodePath('$Player/Head')).toEqual({ path: 'Player/Head', corrected: true })
  })

  it('should strip res:// and user://', () => {
    expect(normalizeNodePath('res://Player/Head')).toEqual({ path: 'Player/Head', corrected: true })
    expect(normalizeNodePath('user://Player/Head')).toEqual({ path: 'Player/Head', corrected: true })
  })

  it('should collapse redundant slashes', () => {
    expect(normalizeNodePath('Player//Head')).toEqual({ path: 'Player/Head', corrected: true })
  })

  it('should handle empty or slash-only input', () => {
    expect(normalizeNodePath('')).toEqual({ path: '', corrected: false })
    expect(normalizeNodePath('/')).toEqual({ path: '.', corrected: true })
    expect(normalizeNodePath('///')).toEqual({ path: '.', corrected: true })
  })
})
