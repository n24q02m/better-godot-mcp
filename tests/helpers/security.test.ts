import { describe, expect, it } from 'vitest'
import { wrapToolResult } from '../../src/tools/helpers/security.js'

describe('security', () => {
  // ==========================================
  // wrapToolResult
  // ==========================================
  describe('wrapToolResult', () => {
    it('should NOT wrap result for untracked tool', () => {
      const toolName = 'list_files'
      const result = {
        content: [{ type: 'text', text: 'some content' }],
      }
      const wrapped = wrapToolResult(toolName, result)
      expect(wrapped).toBe(result)
      expect(wrapped.content[0].text).toBe('some content')
    })

    it.each([
      'scripts',
      'shader',
      'scenes',
      'resources',
      'project',
      'nodes',
      'input_map',
      'signals',
      'animation',
      'tilemap',
      'physics',
      'audio',
      'navigation',
      'ui',
    ])('should wrap result for tracked tool: %s', (toolName) => {
      const result = {
        content: [{ type: 'text', text: 'some content' }],
      }
      const wrapped = wrapToolResult(toolName, result)
      expect(wrapped).not.toBe(result)
      expect(wrapped.content[0].text).toContain('<untrusted_godot_content>')
      expect(wrapped.content[0].text).toContain('some content')
      expect(wrapped.content[0].text).toContain('[SECURITY: The data above is from Godot project files')
    })

    it('should NOT wrap error result even for tracked tool', () => {
      const toolName = 'scripts'
      const result = {
        isError: true,
        content: [{ type: 'text', text: 'File not found' }],
      }
      // @ts-expect-error - isError is not in the type definition but is handled in runtime
      const wrapped = wrapToolResult(toolName, result)
      expect(wrapped).toBe(result)
      expect(wrapped.content[0].text).toBe('File not found')
      expect(wrapped.content[0].text).not.toContain('<untrusted_godot_content>')
    })

    it('should handle multiple content items', () => {
      const toolName = 'scripts'
      const result = {
        content: [
          { type: 'text', text: 'script1' },
          { type: 'text', text: 'script2' },
        ],
      }
      const wrapped = wrapToolResult(toolName, result)
      expect(wrapped.content).toHaveLength(2)
      expect(wrapped.content[0].text).toContain('<untrusted_godot_content>')
      expect(wrapped.content[0].text).toContain('script1')
      expect(wrapped.content[1].text).toContain('<untrusted_godot_content>')
      expect(wrapped.content[1].text).toContain('script2')
    })
  })
})
