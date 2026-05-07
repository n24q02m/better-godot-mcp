/**
 * Registry tests - Tool registration, schema validation, and routing
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

// Expected tools in order of definition
const EXPECTED_TOOLS = [
  'project',
  'scenes',
  'nodes',
  'scripts',
  'editor',
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

describe('registry', () => {
  let registrySource: string

  beforeAll(() => {
    registrySource = readFileSync(resolve(import.meta.dirname, '../src/tools/registry.ts'), 'utf-8')
  })

  // ==========================================
  // Tool definitions
  // ==========================================
  describe('tool definitions', () => {
    it('should define all expected tool names', () => {
      for (const tool of EXPECTED_TOOLS) {
        expect(registrySource).toContain(`name: '${tool}'`)
      }
    })

    it('should have exactly 17 tools (7 P0 + 3 P1 + 4 P2 + 3 P3)', () => {
      const nameMatches = registrySource.match(/name: '(\w+)'/g)
      // Each tool definition has a name property. We expect 17 matches for the 17 tools.
      expect(nameMatches?.length).toBe(EXPECTED_TOOLS.length)
    })

    it('all tools should have annotations', () => {
      // Count annotations blocks (each tool should have one)
      const annotationsMatches = registrySource.match(/annotations:\s*createAnnotations/g)
      expect(annotationsMatches?.length).toBe(EXPECTED_TOOLS.length)
    })

    it('all annotations should have required fields', () => {
      const annotationCalls = (registrySource.match(/annotations: createAnnotations/g) || []).length
      expect(annotationCalls).toBe(EXPECTED_TOOLS.length)

      // The individual hint fields now appear exactly once in the helper function
      expect(registrySource).toContain('readOnlyHint: options.readOnly ?? false')
      expect(registrySource).toContain('destructiveHint: options.destructive ?? false')
      expect(registrySource).toContain('idempotentHint: options.idempotent ?? false')
      expect(registrySource).toContain('openWorldHint: false')
    })

    it('all tools should have inputSchema with required action', () => {
      const inputSchemaCount = (registrySource.match(/inputSchema:\s*\{/g) || []).length
      expect(inputSchemaCount).toBe(EXPECTED_TOOLS.length)

      // help tool requires 'tool_name' instead of 'action'
      const requiredActionCount = (registrySource.match(/required:\s*\['action']/g) || []).length
      expect(requiredActionCount).toBe(EXPECTED_TOOLS.length - 1) // 17 minus help (uses 'tool_name')

      // help uses 'tool_name' as required
      expect(registrySource).toContain("required: ['tool_name']")
    })
  })

  // ==========================================
  // Tool routing via switch
  // ==========================================
  describe('routing', () => {
    it('should map handlers for all 17 tools', () => {
      for (const toolName of EXPECTED_TOOLS) {
        if (toolName === 'help') {
          expect(registrySource).toContain("if (name === 'help')")
        } else {
          expect(registrySource).toContain(`${toolName}: handle`)
        }
      }
    })

    it('should handle unknown tools with error and suggestion', () => {
      expect(registrySource).toContain('if (!handler)')
      expect(registrySource).toContain('throw new GodotMCPError')
      expect(registrySource).toContain('Unknown tool')
    })
  })

  // ==========================================
  // Priority grouping
  // ==========================================
  describe('priority grouping', () => {
    it('P0 should have 7 core tools', () => {
      const p0Section = registrySource.slice(
        registrySource.indexOf('const P0_TOOLS'),
        registrySource.indexOf('const P1_TOOLS'),
      )
      const names = p0Section.match(/name: '(\w+)'/g)
      expect(names?.length).toBe(7)
    })

    it('P1 should have 3 extended tools', () => {
      const p1Section = registrySource.slice(
        registrySource.indexOf('const P1_TOOLS'),
        registrySource.indexOf('const P2_TOOLS'),
      )
      const names = p1Section.match(/name: '(\w+)'/g)
      expect(names?.length).toBe(3)
    })

    it('P2 should have 4 specialized tools', () => {
      const p2Section = registrySource.slice(
        registrySource.indexOf('const P2_TOOLS'),
        registrySource.indexOf('const P3_TOOLS'),
      )
      const names = p2Section.match(/name: '(\w+)'/g)
      expect(names?.length).toBe(4)
    })

    it('P3 should have 3 advanced tools', () => {
      const p3Section = registrySource.slice(
        registrySource.indexOf('const P3_TOOLS'),
        registrySource.indexOf('const TOOLS'),
      )
      const names = p3Section.match(/name: '(\w+)'/g)
      expect(names?.length).toBe(3)
    })
  })

  // ==========================================
  // Schema correctness
  // ==========================================
  describe('schema correctness', () => {
    it('help tool should list all other tool names in its enum', () => {
      // Extract the help tool's tool_name enum
      const helpSection = registrySource.slice(
        registrySource.indexOf("name: 'help'"),
        registrySource.indexOf('},\n]', registrySource.indexOf("name: 'help'")),
      )

      for (const tool of EXPECTED_TOOLS) {
        expect(helpSection).toContain(`'${tool}'`)
      }
    })

    it('read-only tools should have readOnlyHint=true', () => {
      // help should be read-only
      const helpSection = registrySource.slice(
        registrySource.indexOf("name: 'help'"),
        registrySource.indexOf('const P1_TOOLS'),
      )
      expect(helpSection).toContain('readOnly: true')
    })

    it('destructive tools should have destructiveHint=true', () => {
      // scenes, nodes, scripts should be destructive
      for (const toolName of ['scenes', 'nodes', 'scripts', 'resources', 'signals']) {
        const start = registrySource.indexOf(`name: '${toolName}'`)
        const end = registrySource.indexOf('},\n', start + 1)
        const section = registrySource.slice(start, end)
        expect(section, `${toolName} should be destructive`).toContain('destructive: true')
      }
    })
  })
})
