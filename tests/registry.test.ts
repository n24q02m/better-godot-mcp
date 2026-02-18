/**
 * Registry tests - Tool registration, schema validation, and routing
 */

import { describe, expect, it } from 'vitest'

// Import the tools arrays directly by re-parsing the registry module
// Since TOOLS is not exported, we test the public API through init-server

describe('registry', () => {
  // ==========================================
  // Tool definitions
  // ==========================================
  describe('tool definitions', () => {
    // We import the entire registry module to test structure
    let registrySource: string

    it('should define all expected tool names', async () => {
      const { readFileSync } = await import('node:fs')
      const { resolve } = await import('node:path')
      registrySource = readFileSync(resolve(import.meta.dirname, '../src/tools/registry.ts'), 'utf-8')

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

      for (const tool of expectedTools) {
        expect(registrySource).toContain(`name: '${tool}'`)
      }
    })

    it('should have exactly 18 tools (8 P0 + 3 P1 + 4 P2 + 3 P3)', async () => {
      const { readFileSync } = await import('node:fs')
      const { resolve } = await import('node:path')
      registrySource = readFileSync(resolve(import.meta.dirname, '../src/tools/registry.ts'), 'utf-8')

      const nameMatches = registrySource.match(/name: '(\w+)'/g)
      // Filter to only tool definition names (inside TOOLS arrays)
      // Each tool has exactly one name: 'xxx' entry
      expect(nameMatches?.length).toBe(18)
    })

    it('all tools should have annotations', async () => {
      const { readFileSync } = await import('node:fs')
      const { resolve } = await import('node:path')
      registrySource = readFileSync(resolve(import.meta.dirname, '../src/tools/registry.ts'), 'utf-8')

      // Count annotations blocks (each tool should have one)
      const annotationsMatches = registrySource.match(/annotations:\s*\{/g)
      expect(annotationsMatches?.length).toBe(18)
    })

    it('all annotations should have required fields', async () => {
      const { readFileSync } = await import('node:fs')
      const { resolve } = await import('node:path')
      registrySource = readFileSync(resolve(import.meta.dirname, '../src/tools/registry.ts'), 'utf-8')

      // Each annotation block should have all 5 fields
      const titleCount = (registrySource.match(/title:/g) || []).length
      const readOnlyCount = (registrySource.match(/readOnlyHint:/g) || []).length
      const destructiveCount = (registrySource.match(/destructiveHint:/g) || []).length
      const idempotentCount = (registrySource.match(/idempotentHint:/g) || []).length
      const openWorldCount = (registrySource.match(/openWorldHint:/g) || []).length

      expect(titleCount).toBe(18)
      expect(readOnlyCount).toBe(18)
      expect(destructiveCount).toBe(18)
      expect(idempotentCount).toBe(18)
      expect(openWorldCount).toBe(18)
    })

    it('all tools should have inputSchema with required action', async () => {
      const { readFileSync } = await import('node:fs')
      const { resolve } = await import('node:path')
      registrySource = readFileSync(resolve(import.meta.dirname, '../src/tools/registry.ts'), 'utf-8')

      const inputSchemaCount = (registrySource.match(/inputSchema:\s*\{/g) || []).length
      expect(inputSchemaCount).toBe(18)

      // help tool requires 'tool_name' instead of 'action'
      const requiredActionCount = (registrySource.match(/required:\s*\['action'\]/g) || []).length
      expect(requiredActionCount).toBe(17) // 18 minus help (uses 'tool_name')

      // help uses 'tool_name' as required
      expect(registrySource).toContain("required: ['tool_name']")
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

      const expectedCases = [
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
    it('P0 should have 8 core tools', async () => {
      const { readFileSync } = await import('node:fs')
      const { resolve } = await import('node:path')
      const source = readFileSync(resolve(import.meta.dirname, '../src/tools/registry.ts'), 'utf-8')

      const p0Section = source.slice(source.indexOf('const P0_TOOLS'), source.indexOf('const P1_TOOLS'))
      const names = p0Section.match(/name: '(\w+)'/g)
      expect(names?.length).toBe(8)
    })

    it('P1 should have 3 extended tools', async () => {
      const { readFileSync } = await import('node:fs')
      const { resolve } = await import('node:path')
      const source = readFileSync(resolve(import.meta.dirname, '../src/tools/registry.ts'), 'utf-8')

      const p1Section = source.slice(source.indexOf('const P1_TOOLS'), source.indexOf('const P2_TOOLS'))
      const names = p1Section.match(/name: '(\w+)'/g)
      expect(names?.length).toBe(3)
    })

    it('P2 should have 4 specialized tools', async () => {
      const { readFileSync } = await import('node:fs')
      const { resolve } = await import('node:path')
      const source = readFileSync(resolve(import.meta.dirname, '../src/tools/registry.ts'), 'utf-8')

      const p2Section = source.slice(source.indexOf('const P2_TOOLS'), source.indexOf('const P3_TOOLS'))
      const names = p2Section.match(/name: '(\w+)'/g)
      expect(names?.length).toBe(4)
    })

    it('P3 should have 3 advanced tools', async () => {
      const { readFileSync } = await import('node:fs')
      const { resolve } = await import('node:path')
      const source = readFileSync(resolve(import.meta.dirname, '../src/tools/registry.ts'), 'utf-8')

      const p3Section = source.slice(source.indexOf('const P3_TOOLS'), source.indexOf('const TOOLS'))
      const names = p3Section.match(/name: '(\w+)'/g)
      expect(names?.length).toBe(3)
    })
  })

  // ==========================================
  // Schema correctness
  // ==========================================
  describe('schema correctness', () => {
    it('help tool should list all other tool names in its enum', async () => {
      const { readFileSync } = await import('node:fs')
      const { resolve } = await import('node:path')
      const source = readFileSync(resolve(import.meta.dirname, '../src/tools/registry.ts'), 'utf-8')

      // Extract the help tool's tool_name enum
      const helpSection = source.slice(
        source.indexOf("name: 'help'"),
        source.indexOf('},\n]', source.indexOf("name: 'help'")),
      )

      const expectedInEnum = [
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

      for (const tool of expectedInEnum) {
        expect(helpSection).toContain(`'${tool}'`)
      }
    })

    it('read-only tools should have readOnlyHint=true', async () => {
      const { readFileSync } = await import('node:fs')
      const { resolve } = await import('node:path')
      const source = readFileSync(resolve(import.meta.dirname, '../src/tools/registry.ts'), 'utf-8')

      // setup and help should be read-only
      const setupSection = source.slice(source.indexOf("name: 'setup'"), source.indexOf("name: 'config'"))
      expect(setupSection).toContain('readOnlyHint: true')

      const helpSection = source.slice(source.indexOf("name: 'help'"), source.indexOf('const P1_TOOLS'))
      expect(helpSection).toContain('readOnlyHint: true')
    })

    it('destructive tools should have destructiveHint=true', async () => {
      const { readFileSync } = await import('node:fs')
      const { resolve } = await import('node:path')
      const source = readFileSync(resolve(import.meta.dirname, '../src/tools/registry.ts'), 'utf-8')

      // scenes, nodes, scripts should be destructive
      for (const toolName of ['scenes', 'nodes', 'scripts', 'resources', 'signals']) {
        const start = source.indexOf(`name: '${toolName}'`)
        const end = source.indexOf('},\n', start + 1)
        const section = source.slice(start, end)
        expect(section, `${toolName} should be destructive`).toContain('destructiveHint: true')
      }
    })
  })
})
