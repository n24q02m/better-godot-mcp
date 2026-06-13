import { describe, expect, it } from 'vitest'
import { normalizeNodePath } from '../../src/tools/helpers/scene-parser.js'

describe('normalizeNodePath', () => {
  it('should handle empty or null input', () => {
    expect(normalizeNodePath('').path).toBe('')
    expect(normalizeNodePath(null as unknown as string).path).toBe('')
  })

  it('should handle simple names', () => {
    expect(normalizeNodePath('Player').path).toBe('Player')
    expect(normalizeNodePath('Sprite2D').path).toBe('Sprite2D')
  })

  it('should handle dot as root', () => {
    expect(normalizeNodePath('.').path).toBe('.')
  })

  it('should strip leading/trailing whitespace', () => {
    expect(normalizeNodePath('  Player  ').path).toBe('Player')
    expect(normalizeNodePath('\tNode\n').path).toBe('Node')
  })

  it('should normalize backslashes', () => {
    expect(normalizeNodePath('Player\\Sprite').path).toBe('Player/Sprite')
    expect(normalizeNodePath('UI\\Container\\Button').path).toBe('UI/Container/Button')
  })

  it('should handle redundant slashes', () => {
    expect(normalizeNodePath('Player//Sprite').path).toBe('Player/Sprite')
    expect(normalizeNodePath('///root///Player').path).toBe('.')
  })

  it('should strip GDScript $ prefix', () => {
    expect(normalizeNodePath('$Player').path).toBe('Player')
    expect(normalizeNodePath('$Player/Sprite').path).toBe('Player/Sprite')
    expect(normalizeNodePath('$').path).toBe('.')
  })

  it('should handle get_node() wrappers', () => {
    expect(normalizeNodePath('get_node("Player")').path).toBe('Player')
    expect(normalizeNodePath("get_node('Player/Sprite')").path).toBe('Player/Sprite')
    expect(normalizeNodePath('get_node( "UI" )').path).toBe('UI')
  })

  it('should strip /root/ prefix correctly', () => {
    // /root/SceneName -> .
    expect(normalizeNodePath('/root/Main').path).toBe('.')
    expect(normalizeNodePath('root/Player').path).toBe('.')

    // /root/SceneName/Child -> Child
    expect(normalizeNodePath('/root/Main/Player').path).toBe('Player')
    expect(normalizeNodePath('/root/Player/Sprite').path).toBe('Sprite')

    // /root/SceneName/Child/GrandChild -> Child/GrandChild
    expect(normalizeNodePath('/root/Level/Enemies/Slime').path).toBe('Enemies/Slime')
  })

  it('should handle exact root matches', () => {
    expect(normalizeNodePath('/root').path).toBe('.')
    expect(normalizeNodePath('root').path).toBe('.')
  })

  it('should strip leading slashes after other normalizations', () => {
    expect(normalizeNodePath('/Player').path).toBe('Player')
    expect(normalizeNodePath('//UI/Label').path).toBe('UI/Label')
  })

  it('should track if correction occurred', () => {
    expect(normalizeNodePath('Player').corrected).toBe(false)
    expect(normalizeNodePath('  Player  ').corrected).toBe(true)
    expect(normalizeNodePath('Player\\Sprite').corrected).toBe(true)
    expect(normalizeNodePath('$Player').corrected).toBe(true)
    expect(normalizeNodePath('get_node("P")').corrected).toBe(true)
    expect(normalizeNodePath('/root/Scene/Node').corrected).toBe(true)
    expect(normalizeNodePath('/Node').corrected).toBe(true)
  })
})
