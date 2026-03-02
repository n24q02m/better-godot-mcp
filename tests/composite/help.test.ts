import { existsSync, readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

  it('should evaluate multiple candidates in getDocsDir', async () => {
    vi.mocked(readFileSync).mockReturnValue('# Test Doc')
    // Return false for first 2 candidate directories, true for 3rd
    vi.mocked(existsSync).mockImplementation((pathStr) => {
      const path = String(pathStr)
      if (path.endsWith('.md')) return true // Let loadDoc succeed
      if (path.includes('src/docs') && path.includes('build')) return false // candidate 4
      if (path.includes('src/docs') && !path.includes('..')) return true // candidate 3 (cwd)
      return false // candidate 1 & 2
    })

    const result = await handleHelp('project', {})
    expect(result.content[0].text).toContain('# Test Doc')
    // existsSync will be called multiple times: for dir candidates and then for the file
    const callCount = vi.mocked(existsSync).mock.calls.length
    expect(callCount).toBeGreaterThan(1)
  })

  it('should fall back to default path if all candidates fail in getDocsDir', async () => {
    vi.mocked(readFileSync).mockReturnValue('# Fallback Doc')
    // Mock all directory candidates to fail, but allow the .md file check to succeed
    vi.mocked(existsSync).mockImplementation((pathStr) => {
      const path = String(pathStr)
      if (path.endsWith('.md')) return true
      return false
    })

    const result = await handleHelp('project', {})
    expect(result.content[0].text).toContain('# Fallback Doc')

    // Since we mock the environment to test different paths, we just assert the call count is at least the number of candidates
    // depending on the execution environment it checks. It's safe to assume it's at least 3
    const callCount = vi.mocked(existsSync).mock.calls.length
    expect(callCount).toBeGreaterThan(2)
  })
})
