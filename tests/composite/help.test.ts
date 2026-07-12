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
    // Default mock for getDocsDir() logic (marker file exists)
    vi.mocked(pathExists).mockResolvedValue(true)
  })

  it('should return documentation for valid topic', async () => {
    // Mock valid documentation file
    vi.mocked(readFile).mockResolvedValue('# Test Documentation')

    const result = await handleHelp('project', {})

    expect(result.content[0].text).toContain('# Test Documentation')
    expect(readFile).toHaveBeenCalled()
  })

  it('should never emit structuredContent -- help stays markdown-only, no outputSchema declared', async () => {
    vi.mocked(readFile).mockResolvedValue('# Test Documentation')

    const result = await handleHelp('project', {})

    expect((result as Record<string, unknown>).structuredContent).toBeUndefined()
  })

  it('should use tool_name from arguments if provided', async () => {
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

  it('should return fallback message if documentation file is missing (ENOENT)', async () => {
    // Mock readFile throwing ENOENT (EAFP pattern)
    const enoent = new Error('File not found') as NodeJS.ErrnoException
    enoent.code = 'ENOENT'
    vi.mocked(readFile).mockRejectedValue(enoent)

    const result = await handleHelp('project', {})

    expect(result.content[0].text).toContain('No documentation available for: project')
  })

  it('should rethrow non-ENOENT errors from readFile', async () => {
    // Mock readFile throwing a different error (e.g., EACCES)
    const eacces = new Error('Permission denied') as NodeJS.ErrnoException
    eacces.code = 'EACCES'
    vi.mocked(readFile).mockRejectedValue(eacces)

    await expect(handleHelp('project', {})).rejects.toThrow('Permission denied')
  })
})
