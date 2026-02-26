import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handleHelp } from '../../src/tools/composite/help.js'
import { GodotMCPError } from '../../src/tools/helpers/errors.js'

// Mock node:fs
vi.mock('node:fs', () => {
  return {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  }
})

describe('handleHelp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return documentation for valid topic', async () => {
    // Mock valid documentation file
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue('# Test Documentation')

    const result = await handleHelp('project', {})

    expect(result.content[0].text).toContain('# Test Documentation')
    expect(existsSync).toHaveBeenCalled()
    expect(readFileSync).toHaveBeenCalled()
  })

  it('should use tool_name from arguments if provided', async () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readFileSync).mockReturnValue('# Scenes Documentation')

    const result = await handleHelp('help', { tool_name: 'scenes' })

    expect(result.content[0].text).toContain('# Scenes Documentation')
    // Verify it looked for scenes.md, not help.md
    const calledPath = vi.mocked(readFileSync).mock.calls[0][0] as string
    expect(calledPath).toContain('scenes.md')
  })

  it('should throw error for invalid topic', async () => {
    await expect(handleHelp('invalid_tool', {})).rejects.toThrow(GodotMCPError)
    await expect(handleHelp('help', { tool_name: 'invalid_tool' })).rejects.toThrow('Unknown tool: invalid_tool')
  })

  it('should return fallback message if documentation file is missing', async () => {
    // Mock file not found
    vi.mocked(existsSync).mockReturnValue(false)

    const result = await handleHelp('project', {})

    expect(result.content[0].text).toContain('No documentation available for: project')
  })
})
