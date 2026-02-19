/**
 * Registry tests - Tool registration, schema validation, and routing
 */

import { describe, expect, it } from 'vitest'
import { P3_TOOLS } from '../src/tools/definitions/advanced.js'
import { P0_TOOLS } from '../src/tools/definitions/core.js'
import { P1_TOOLS } from '../src/tools/definitions/extended.js'
import { P2_TOOLS } from '../src/tools/definitions/specialized.js'
import { TOOLS } from '../src/tools/registry.js'

describe('registry', () => {
  // ==========================================
  // Tool definitions
  // ==========================================
  describe('tool definitions', () => {
    it('should define all expected tool names', () => {
      const expectedTools = [
        'project',
        'scenes',
        'nodes',
        'scripts',
        'editor',
        'setup',
        'config',
        'help',
        'resources',
        'input_map',
        'signals',
        'animation',
        'tilemap',
        'shader',
        'physics',
        'audio',
        'navigation',
        'ui',
      ]

      const toolNames = TOOLS.map((t) => t.name)
      for (const tool of expectedTools) {
        expect(toolNames).toContain(tool)
      }
    })

    it('should have exactly 18 tools (8 P0 + 3 P1 + 4 P2 + 3 P3)', () => {
      expect(TOOLS.length).toBe(18)
    })

    it('all tools should have annotations', () => {
      for (const tool of TOOLS) {
        expect(tool.annotations).toBeDefined()
      }
    })

    it('all annotations should have required fields', () => {
      for (const tool of TOOLS) {
        const annotations = tool.annotations
        expect(annotations).toHaveProperty('title')
        expect(annotations).toHaveProperty('readOnlyHint')
        expect(annotations).toHaveProperty('destructiveHint')
        expect(annotations).toHaveProperty('idempotentHint')
        expect(annotations).toHaveProperty('openWorldHint')
      }
    })

    it('all tools should have inputSchema with required action', () => {
      for (const tool of TOOLS) {
        expect(tool.inputSchema).toBeDefined()
        expect(tool.inputSchema.type).toBe('object')

        if (tool.name === 'help') {
          expect(tool.inputSchema.required).toContain('tool_name')
        } else {
          expect(tool.inputSchema.required).toContain('action')
        }
      }
    })
  })

  // ==========================================
  // Tool routing via switch
  // ==========================================
  describe('routing', () => {
    it('should have case handlers for all 18 tools', async () => {
      const { readFileSync } = await import('node:fs')
      const { resolve } = await import('node:path')
      const source = readFileSync(resolve(import.meta.dirname, '../src/tools/registry.ts'), 'utf-8')

      const expectedCases = TOOLS.map((t) => t.name)

      for (const toolName of expectedCases) {
        expect(source).toContain(`case '${toolName}':`)
      }
    })

    it('should have a default case for unknown tools', async () => {
      const { readFileSync } = await import('node:fs')
      const { resolve } = await import('node:path')
      const source = readFileSync(resolve(import.meta.dirname, '../src/tools/registry.ts'), 'utf-8')

      expect(source).toContain('default:')
      expect(source).toContain('Unknown tool')
    })
  })

  // ==========================================
  // Priority grouping
  // ==========================================
  describe('priority grouping', () => {
    it('P0 should have 8 core tools', () => {
      expect(P0_TOOLS.length).toBe(8)
      expect(P0_TOOLS.map((t) => t.name)).toEqual(
        expect.arrayContaining(['project', 'scenes', 'nodes', 'scripts', 'editor', 'setup', 'config', 'help']),
      )
    })

    it('P1 should have 3 extended tools', () => {
      expect(P1_TOOLS.length).toBe(3)
      expect(P1_TOOLS.map((t) => t.name)).toEqual(expect.arrayContaining(['resources', 'input_map', 'signals']))
    })

    it('P2 should have 4 specialized tools', () => {
      expect(P2_TOOLS.length).toBe(4)
      expect(P2_TOOLS.map((t) => t.name)).toEqual(expect.arrayContaining(['animation', 'tilemap', 'shader', 'physics']))
    })

    it('P3 should have 3 advanced tools', () => {
      expect(P3_TOOLS.length).toBe(3)
      expect(P3_TOOLS.map((t) => t.name)).toEqual(expect.arrayContaining(['audio', 'navigation', 'ui']))
    })
  })

  // ==========================================
  // Schema correctness
  // ==========================================
  describe('schema correctness', () => {
    it('help tool should list all other tool names in its enum', () => {
      const helpTool = TOOLS.find((t) => t.name === 'help')
      expect(helpTool).toBeDefined()

      const enumValues = (helpTool?.inputSchema?.properties as any)?.tool_name?.enum
      expect(enumValues).toBeDefined()

      const allToolNames = TOOLS.map((t) => t.name)

      for (const tool of allToolNames) {
        expect(enumValues).toContain(tool)
      }
    })

    it('read-only tools should have readOnlyHint=true', () => {
      const readOnlyTools = ['setup', 'help']
      for (const name of readOnlyTools) {
        const tool = TOOLS.find((t) => t.name === name)
        expect(tool?.annotations?.readOnlyHint).toBe(true)
      }
    })

    it('destructive tools should have destructiveHint=true', () => {
      const destructiveTools = ['scenes', 'nodes', 'scripts', 'resources', 'signals']
      for (const name of destructiveTools) {
        const tool = TOOLS.find((t) => t.name === name)
        expect(tool?.annotations?.destructiveHint).toBe(true)
      }
    })
  })
})
