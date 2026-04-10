import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GodotConfig } from '../src/godot/types.js'
import { makeConfig } from './fixtures.js'

// Mock composite handlers to return known content
vi.mock('../src/tools/composite/scripts.js', () => ({
  handleScripts: vi.fn(() => ({ content: [{ type: 'text', text: 'original script content' }] })),
}))
vi.mock('../src/tools/composite/config.js', () => ({
  handleConfig: vi.fn(() => ({ content: [{ type: 'text', text: 'config content' }] })),
}))
vi.mock('../src/tools/composite/help.js', () => ({
  handleHelp: vi.fn(() => ({ content: [{ type: 'text', text: 'help content' }] })),
}))
vi.mock('../src/tools/composite/project.js', () => ({
  handleProject: vi.fn(() => ({ content: [{ type: 'text', text: 'project content' }] })),
}))

describe('registerTools security integration', () => {
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

  it('should capture callToolHandler', () => {
    expect(callToolHandler).not.toBeNull()
  })

  it('should wrap results for scripts tool (external content)', async () => {
    const result = (await callToolHandler?.({
      params: { name: 'scripts', arguments: { action: 'list' } },
    })) as { content: Array<{ text: string }> }

    expect(result.content[0].text).toContain('<untrusted_godot_content>')
    expect(result.content[0].text).toContain('original script content')
    expect(result.content[0].text).toContain('[SECURITY:')
  })

  it('should NOT wrap results for config tool (internal content)', async () => {
    const result = (await callToolHandler?.({
      params: { name: 'config', arguments: { action: 'status' } },
    })) as { content: Array<{ text: string }> }

    expect(result.content[0].text).toBe('config content')
    expect(result.content[0].text).not.toContain('<untrusted_godot_content>')
  })

  it('should NOT wrap results for help tool', async () => {
    const result = (await callToolHandler?.({
      params: { name: 'help', arguments: { tool_name: 'scripts' } },
    })) as { content: Array<{ text: string }> }

    expect(result.content[0].text).toBe('help content')
    expect(result.content[0].text).not.toContain('<untrusted_godot_content>')
  })

  it('should NOT wrap error results when handler throws', async () => {
    const { handleScripts } = await import('../src/tools/composite/scripts.js')
    vi.mocked(handleScripts).mockRejectedValueOnce(new Error('something went wrong'))

    const result = (await callToolHandler?.({
      params: { name: 'scripts', arguments: { action: 'list' } },
    })) as { isError: boolean; content: Array<{ text: string }> }

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('something went wrong')
    expect(result.content[0].text).not.toContain('<untrusted_godot_content>')
  })

  it('should NOT wrap results with isError: true returned by handler', async () => {
    const { handleScripts } = await import('../src/tools/composite/scripts.js')
    vi.mocked(handleScripts).mockResolvedValueOnce({
      isError: true,
      content: [{ type: 'text', text: 'returned error message' }],
    } as unknown as { content: Array<{ type: string; text: string }> })

    const result = (await callToolHandler?.({
      params: { name: 'scripts', arguments: { action: 'list' } },
    })) as { isError: boolean; content: Array<{ text: string }> }

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe('returned error message')
    expect(result.content[0].text).not.toContain('<untrusted_godot_content>')
  })

  it('should return error for unknown tool and NOT wrap it', async () => {
    const result = (await callToolHandler?.({
      params: { name: 'nonexistent_tool', arguments: {} },
    })) as { isError: boolean; content: Array<{ text: string }> }

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Unknown tool')
    expect(result.content[0].text).not.toContain('<untrusted_godot_content>')
  })
})
