import { readFile } from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleHelp } from '../../src/tools/composite/help.js'
import { GodotMCPError } from '../../src/tools/helpers/errors.js'
import { pathExists } from '../../src/tools/helpers/paths.js'

// Mock node:fs/promises and paths helper
vi.mock('node:fs/promises', () => {
  return {
    readFile: vi.fn(),
  }
})
vi.mock('../../src/tools/helpers/paths.js', () => ({
  pathExists: vi.fn(),
}))

describe('handleHelp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return documentation for valid topic', async () => {
    // Mock valid documentation file
    vi.mocked(pathExists).mockResolvedValue(true)
    vi.mocked(readFile).mockResolvedValue('# Test Documentation')

    const result = await handleHelp('project', {})

    expect(result.content[0].text).toContain('# Test Documentation')
    expect(pathExists).toHaveBeenCalled()
    expect(readFile).toHaveBeenCalled()
  })

  it('should use tool_name from arguments if provided', async () => {
    vi.mocked(pathExists).mockResolvedValue(true)
    vi.mocked(readFile).mockResolvedValue('# Scenes Documentation')

    const result = await handleHelp('help', { tool_name: 'scenes' })

    expect(result.content[0].text).toContain('# Scenes Documentation')
    // Verify it looked for scenes.md, not help.md
    const calledPath = vi.mocked(readFile).mock.calls[0][0] as string
    expect(calledPath).toContain('scenes.md')
  })

  it('should throw error for invalid topic', async () => {
    await expect(handleHelp('invalid_tool', {})).rejects.toThrow(GodotMCPError)
    await expect(handleHelp('help', { tool_name: 'invalid_tool' })).rejects.toThrow('Unknown tool: invalid_tool')
  })

  it('should return fallback message if documentation file is missing', async () => {
    // Mock file not found
    vi.mocked(pathExists).mockResolvedValue(false)

    const result = await handleHelp('project', {})

    expect(result.content[0].text).toContain('No documentation available for: project')
  })
})
