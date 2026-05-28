/**
 * Coverage tests for registerTools error handling and edge cases
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GodotConfig } from '../src/godot/types.js'
import { makeConfig } from './fixtures.js'

// Mock all tool handlers
vi.mock('../src/tools/composite/help.js', () => ({ handleHelp: vi.fn() }))
vi.mock('../src/tools/composite/project.js', () => ({
  handleProject: vi.fn(() => ({ content: [{ type: 'text', text: 'project result' }] })),
}))
vi.mock('../src/tools/composite/scenes.js', () => ({ handleScenes: vi.fn() }))
vi.mock('../src/tools/composite/nodes.js', () => ({ handleNodes: vi.fn() }))
vi.mock('../src/tools/composite/scripts.js', () => ({ handleScripts: vi.fn() }))
vi.mock('../src/tools/composite/editor.js', () => ({ handleEditor: vi.fn() }))
vi.mock('../src/tools/composite/config.js', () => ({ handleConfig: vi.fn() }))
vi.mock('../src/tools/composite/resources.js', () => ({ handleResources: vi.fn() }))
vi.mock('../src/tools/composite/input-map.js', () => ({ handleInputMap: vi.fn() }))
vi.mock('../src/tools/composite/signals.js', () => ({ handleSignals: vi.fn() }))
vi.mock('../src/tools/composite/animation.js', () => ({ handleAnimation: vi.fn() }))
vi.mock('../src/tools/composite/tilemap.js', () => ({ handleTilemap: vi.fn() }))
vi.mock('../src/tools/composite/shader.js', () => ({ handleShader: vi.fn() }))
vi.mock('../src/tools/composite/physics.js', () => ({ handlePhysics: vi.fn() }))
vi.mock('../src/tools/composite/audio.js', () => ({ handleAudio: vi.fn() }))
vi.mock('../src/tools/composite/navigation.js', () => ({ handleNavigation: vi.fn() }))
vi.mock('../src/tools/composite/ui.js', () => ({ handleUI: vi.fn() }))

// Partial mock for security helpers
vi.mock('../src/tools/helpers/security.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/tools/helpers/security.js')>()
  return {
    ...actual,
    wrapToolResult: vi.fn((_name, result) => result),
  }
})

describe('registerTools coverage', () => {
  let config: GodotConfig
  let callToolHandler:
    | ((request: { params: { name: string; arguments?: Record<string, unknown> } }) => Promise<unknown>)
    | null = null

  beforeEach(async () => {
    vi.clearAllMocks()
    config = makeConfig()

    const mockServer = {
      setRequestHandler: vi.fn((_schema, handler) => {
        if (vi.mocked(mockServer.setRequestHandler).mock.calls.length === 2) {
          callToolHandler = handler as (request: {
            params: { name: string; arguments?: Record<string, unknown> }
          }) => Promise<unknown>
        }
      }),
    }

    const { registerTools } = await import('../src/tools/registry.js')
    registerTools(mockServer as never, config)
  })

  it('should handle unknown tool with no close matches', async () => {
    const result = (await callToolHandler?.({
      params: { name: 'zzzzzzzzzzzz', arguments: {} },
    })) as { isError: boolean; content: Array<{ text: string }> }

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Unknown tool: zzzzzzzzzzzz.')
    expect(result.content[0].text).not.toContain('Did you mean')
  })

  it('should handle unknown tool with close matches', async () => {
    const result = (await callToolHandler?.({
      params: { name: 'projec', arguments: {} },
    })) as { isError: boolean; content: Array<{ text: string }> }

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain("Did you mean 'project'?")
  })

  it('should route help tool with tool_name if action is missing', async () => {
    const { handleHelp } = await import('../src/tools/composite/help.js')
    await callToolHandler?.({
      params: { name: 'help', arguments: { tool_name: 'project' } },
    })
    expect(handleHelp).toHaveBeenCalledWith('project', expect.anything())
  })

  it('should handle errors thrown by handleHelp', async () => {
    const { handleHelp } = await import('../src/tools/composite/help.js')
    vi.mocked(handleHelp).mockRejectedValueOnce(new Error('help error'))

    const result = (await callToolHandler?.({
      params: { name: 'help', arguments: { action: 'info' } },
    })) as { isError: boolean; content: Array<{ text: string }> }

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('help error')
  })

  it('should handle errors thrown by tool handlers (branch else)', async () => {
    const { handleProject } = await import('../src/tools/composite/project.js')
    vi.mocked(handleProject).mockRejectedValueOnce(new Error('handler error'))

    const result = (await callToolHandler?.({
      params: { name: 'project', arguments: { action: 'info' } },
    })) as { isError: boolean; content: Array<{ text: string }> }

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('handler error')
  })

  it('should handle synchronous errors in wrapToolResult', async () => {
    const { wrapToolResult } = await import('../src/tools/helpers/security.js')
    vi.mocked(wrapToolResult).mockImplementationOnce(() => {
      throw new Error('sync wrap error')
    })

    const result = (await callToolHandler?.({
      params: { name: 'project', arguments: { action: 'info' } },
    })) as { isError: boolean; content: Array<{ text: string }> }

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('sync wrap error')
  })
})
