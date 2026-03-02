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

    it('should wrap result for tracked tool', () => {
      const toolName = 'scripts'
      const result = {
        content: [{ type: 'text', text: 'extends Node' }],
      }
      const wrapped = wrapToolResult(toolName, result)
      expect(wrapped).not.toBe(result)
      expect(wrapped.content[0].text).toContain('<untrusted_godot_content>')
      expect(wrapped.content[0].text).toContain('extends Node')
      expect(wrapped.content[0].text).toContain('[SECURITY: The data above is from Godot project files')
    })

    it('should wrap result for shader tool', () => {
      const toolName = 'shader'
      const result = {
        content: [{ type: 'text', text: 'shader_type canvas_item;' }],
      }
      const wrapped = wrapToolResult(toolName, result)
      expect(wrapped.content[0].text).toContain('<untrusted_godot_content>')
    })

    it('should wrap result for scenes tool', () => {
      const toolName = 'scenes'
      const result = {
        content: [{ type: 'text', text: '[node name="Node" type="Node"]' }],
      }
      const wrapped = wrapToolResult(toolName, result)
      expect(wrapped.content[0].text).toContain('<untrusted_godot_content>')
    })

    it('should wrap result for resources tool', () => {
      const toolName = 'resources'
      const result = {
        content: [{ type: 'text', text: '[resource]' }],
      }
      const wrapped = wrapToolResult(toolName, result)
      expect(wrapped.content[0].text).toContain('<untrusted_godot_content>')
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

    it('should wrap result if isError is explicitly false', () => {
      const toolName = 'scripts'
      const result = {
        isError: false,
        content: [{ type: 'text', text: 'extends Node' }],
      }
      // @ts-expect-error - isError is not in the type definition but is handled in runtime
      const wrapped = wrapToolResult(toolName, result)
      expect(wrapped).not.toBe(result)
      expect(wrapped.content[0].text).toContain('<untrusted_godot_content>')
      expect(wrapped.content[0].text).toContain('extends Node')
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

    it('should handle empty content array', () => {
      const toolName = 'scripts'
      const result = {
        content: [],
      }
      const wrapped = wrapToolResult(toolName, result)
      expect(wrapped).not.toBe(result)
      expect(wrapped.content).toHaveLength(0)
    })

    it('should preserve other properties on the result object', () => {
      const toolName = 'scripts'
      const result = {
        content: [{ type: 'text', text: 'extends Node' }],
        extraProp: 'should be preserved',
        metadata: { id: 123 },
      }
      // @ts-expect-error - testing extra properties
      const wrapped = wrapToolResult(toolName, result)
      expect(wrapped).not.toBe(result)
      // @ts-expect-error - testing extra properties
      expect(wrapped.extraProp).toBe('should be preserved')
      // @ts-expect-error - testing extra properties
      expect(wrapped.metadata).toEqual({ id: 123 })
      expect(wrapped.content[0].text).toContain('<untrusted_godot_content>')
    })

    it('should preserve other properties on content items', () => {
      const toolName = 'scripts'
      const result = {
        content: [{ type: 'text', text: 'extends Node', extraItemProp: 'kept' }],
      }
      // @ts-expect-error - testing extra properties
      const wrapped = wrapToolResult(toolName, result)
      expect(wrapped).not.toBe(result)
      // @ts-expect-error - testing extra properties
      expect(wrapped.content[0].extraItemProp).toBe('kept')
      expect(wrapped.content[0].text).toContain('<untrusted_godot_content>')
    })
  })
})
