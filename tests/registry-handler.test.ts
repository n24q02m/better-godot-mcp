/**
 * Tests for registerTools function - handler routing and error handling
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GodotConfig } from '../src/godot/types.js'
import { makeConfig } from './fixtures.js'

// Mock all composite handlers
vi.mock('../src/tools/composite/project.js', () => ({
  handleProject: vi.fn(() => ({ content: [{ type: 'text', text: 'project result' }] })),
}))
vi.mock('../src/tools/composite/scenes.js', () => ({
  handleScenes: vi.fn(() => ({ content: [{ type: 'text', text: 'scenes result' }] })),
}))
vi.mock('../src/tools/composite/nodes.js', () => ({
  handleNodes: vi.fn(() => ({ content: [{ type: 'text', text: 'nodes result' }] })),
}))
vi.mock('../src/tools/composite/scripts.js', () => ({
  handleScripts: vi.fn(() => ({ content: [{ type: 'text', text: 'scripts result' }] })),
}))
vi.mock('../src/tools/composite/editor.js', () => ({
  handleEditor: vi.fn(() => ({ content: [{ type: 'text', text: 'editor result' }] })),
}))
vi.mock('../src/tools/composite/config.js', () => ({
  handleConfig: vi.fn(() => ({ content: [{ type: 'text', text: 'config result' }] })),
}))
vi.mock('../src/tools/composite/help.js', () => ({
  handleHelp: vi.fn(() => ({ content: [{ type: 'text', text: 'help result' }] })),
}))
vi.mock('../src/tools/composite/resources.js', () => ({
  handleResources: vi.fn(() => ({ content: [{ type: 'text', text: 'resources result' }] })),
}))
vi.mock('../src/tools/composite/input-map.js', () => ({
  handleInputMap: vi.fn(() => ({ content: [{ type: 'text', text: 'input_map result' }] })),
}))
vi.mock('../src/tools/composite/signals.js', () => ({
  handleSignals: vi.fn(() => ({ content: [{ type: 'text', text: 'signals result' }] })),
}))
vi.mock('../src/tools/composite/animation.js', () => ({
  handleAnimation: vi.fn(() => ({ content: [{ type: 'text', text: 'animation result' }] })),
}))
vi.mock('../src/tools/composite/tilemap.js', () => ({
  handleTilemap: vi.fn(() => ({ content: [{ type: 'text', text: 'tilemap result' }] })),
}))
vi.mock('../src/tools/composite/shader.js', () => ({
  handleShader: vi.fn(() => ({ content: [{ type: 'text', text: 'shader result' }] })),
}))
vi.mock('../src/tools/composite/physics.js', () => ({
  handlePhysics: vi.fn(() => ({ content: [{ type: 'text', text: 'physics result' }] })),
}))
vi.mock('../src/tools/composite/audio.js', () => ({
  handleAudio: vi.fn(() => ({ content: [{ type: 'text', text: 'audio result' }] })),
}))
vi.mock('../src/tools/composite/navigation.js', () => ({
  handleNavigation: vi.fn(() => ({ content: [{ type: 'text', text: 'navigation result' }] })),
}))
vi.mock('../src/tools/composite/ui.js', () => ({
  handleUI: vi.fn(() => ({ content: [{ type: 'text', text: 'ui result' }] })),
}))

describe('registerTools handler routing', () => {
  let config: GodotConfig
  let listToolsHandler: (() => Promise<{ tools: unknown[] }>) | null = null
  let callToolHandler:
    | ((request: { params: { name: string; arguments?: Record<string, unknown> } }) => Promise<unknown>)
    | null = null

  beforeEach(async () => {
    vi.clearAllMocks()
    config = makeConfig()
    listToolsHandler = null
    callToolHandler = null

    // Create a mock server that captures the registered handlers
    const mockServer = {
      setRequestHandler: vi.fn((_schema: unknown, handler: unknown) => {
        // The schema objects have different identities, so check by the order of registration
        if (!listToolsHandler) {
          listToolsHandler = handler as () => Promise<{ tools: unknown[] }>
        } else {
          callToolHandler = handler as (request: {
            params: { name: string; arguments?: Record<string, unknown> }
          }) => Promise<unknown>
        }
      }),
    }

    const { registerTools } = await import('../src/tools/registry.js')
    registerTools(mockServer as never, config)
  })

  it('should register list tools and call tools handlers', () => {
    expect(listToolsHandler).toBeDefined()
    expect(callToolHandler).toBeDefined()
  })

  it('should list all 17 tools', async () => {
    const result = await listToolsHandler?.()
    expect(result.tools).toHaveLength(17)
  })

  it('should declare an envelope-loose outputSchema on every domain+config tool but not on help', async () => {
    const result = await listToolsHandler?.()
    const tools = result?.tools as Array<{
      name: string
      outputSchema?: { type: string; additionalProperties?: boolean }
    }>
    for (const tool of tools) {
      if (tool.name === 'help') {
        expect(tool.outputSchema, 'help must not declare outputSchema').toBeUndefined()
      } else {
        expect(tool.outputSchema, `${tool.name} should declare outputSchema`).toEqual({
          type: 'object',
          additionalProperties: true,
        })
      }
    }
  })

  // Test routing for all tools
  const toolCases = [
    { name: 'project', action: 'info' },
    { name: 'scenes', action: 'list' },
    { name: 'nodes', action: 'list' },
    { name: 'scripts', action: 'list' },
    { name: 'editor', action: 'status' },
    { name: 'config', action: 'status' },
    { name: 'resources', action: 'list' },
    { name: 'input_map', action: 'list' },
    { name: 'signals', action: 'list' },
    { name: 'animation', action: 'list' },
    { name: 'tilemap', action: 'list' },
    { name: 'shader', action: 'list' },
    { name: 'physics', action: 'layers' },
    { name: 'audio', action: 'list_buses' },
    { name: 'navigation', action: 'create_region' },
    { name: 'ui', action: 'list_controls' },
  ]

  for (const { name, action } of toolCases) {
    it(`should route ${name} tool calls to the correct handler`, async () => {
      const result = await callToolHandler?.({
        params: { name, arguments: { action } },
      })
      expect(result).toBeDefined()
    })
  }

  it('should route help tool with tool_name argument', async () => {
    const result = await callToolHandler?.({
      params: { name: 'help', arguments: { tool_name: 'project' } },
    })
    expect(result).toBeDefined()
  })

  it('should return error for unknown tool', async () => {
    const result = (await callToolHandler?.({
      params: { name: 'unknown_tool', arguments: {} },
    })) as { isError: boolean; content: Array<{ text: string }> }
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Unknown tool')
  })

  it('should handle errors thrown by tool handlers', async () => {
    // Make a handler throw
    const { handleProject } = await import('../src/tools/composite/project.js')
    vi.mocked(handleProject).mockRejectedValueOnce(new Error('test error'))

    const result = (await callToolHandler?.({
      params: { name: 'project', arguments: { action: 'info' } },
    })) as { isError: boolean; content: Array<{ text: string }> }
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('test error')
  })

  it('should handle calls with no arguments', async () => {
    const result = await callToolHandler?.({
      params: { name: 'help', arguments: undefined },
    })
    expect(result).toBeDefined()
  })

  // structuredContent dual-emit, 2 representative tools: 'project' (external-content, XPIA
  // marker applies) and 'config' (internal, no XPIA marker).
  describe('structuredContent dual-emit (tools/call)', () => {
    it('should pass through structuredContent and add the XPIA marker for an external-content tool (project)', async () => {
      const { handleProject } = await import('../src/tools/composite/project.js')
      vi.mocked(handleProject).mockResolvedValueOnce({
        content: [{ type: 'text', text: '{"version":"4.3"}' }],
        structuredContent: { version: '4.3' },
      })

      const result = (await callToolHandler?.({
        params: { name: 'project', arguments: { action: 'version' } },
      })) as { structuredContent?: Record<string, unknown> }

      expect(result.structuredContent).toMatchObject({ version: '4.3' })
      expect(result.structuredContent?._untrusted_source).toBe('godot_project')
    })

    it('should pass through structuredContent unmarked for an internal tool (config)', async () => {
      const { handleConfig } = await import('../src/tools/composite/config.js')
      vi.mocked(handleConfig).mockResolvedValueOnce({
        content: [{ type: 'text', text: '{"godot_path":"not detected"}' }],
        structuredContent: { godot_path: 'not detected' },
      })

      const result = (await callToolHandler?.({
        params: { name: 'config', arguments: { action: 'status' } },
      })) as { structuredContent?: Record<string, unknown> }

      expect(result.structuredContent).toEqual({ godot_path: 'not detected' })
    })

    it('should NOT include structuredContent for help', async () => {
      const result = (await callToolHandler?.({
        params: { name: 'help', arguments: { tool_name: 'project' } },
      })) as { structuredContent?: Record<string, unknown> }

      expect(result.structuredContent).toBeUndefined()
    })
  })
})
