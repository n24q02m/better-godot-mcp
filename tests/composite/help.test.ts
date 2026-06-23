import { readFile } from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
    vi.resetModules()
  })

  it('should return documentation for valid topic', async () => {
    const { handleHelp } = await import('../../src/tools/composite/help.js')
    vi.mocked(pathExists).mockResolvedValue(true)
    vi.mocked(readFile).mockResolvedValue('# Test Documentation')

    const result = await handleHelp('project', {})

    expect(result.content[0].text).toContain('# Test Documentation')
    expect(readFile).toHaveBeenCalled()
  })

  it('should respect priority when multiple candidates exist', async () => {
    const { handleHelp } = await import('../../src/tools/composite/help.js')

    const pathsRequested: string[] = []
    vi.mocked(pathExists).mockImplementation(async (p) => {
      pathsRequested.push(p)
      return true // All exist
    })

    vi.mocked(readFile).mockResolvedValue('# Priority Test')

    await handleHelp('project', {})

    const calledPath = vi.mocked(readFile).mock.calls[0][0] as string

    // The first candidate path should contain 'docs' and not 'build' (based on help.ts)
    // Use a platform-agnostic check for the end of the path
    expect(calledPath).toMatch(/[\\/]docs[\\/]project\.md$/)
    expect(calledPath).not.toContain('build')
  })

  it('should use tool_name from arguments if provided', async () => {
    const { handleHelp } = await import('../../src/tools/composite/help.js')
    vi.mocked(pathExists).mockResolvedValue(true)
    vi.mocked(readFile).mockResolvedValue('# Scenes Documentation')

    const result = await handleHelp('help', { tool_name: 'scenes' })

    expect(result.content[0].text).toContain('# Scenes Documentation')
    const calledPath = vi.mocked(readFile).mock.calls[0][0] as string
    expect(calledPath).toContain('scenes.md')
  })

  it('should throw error for invalid topic', async () => {
    const { handleHelp } = await import('../../src/tools/composite/help.js')
    await expect(handleHelp('invalid_tool', {})).rejects.toThrow(/Unknown tool: invalid_tool/)
  })

  it('should return fallback message if documentation file is missing (ENOENT)', async () => {
    const { handleHelp } = await import('../../src/tools/composite/help.js')
    vi.mocked(pathExists).mockResolvedValue(true)
    const enoent = new Error('File not found') as NodeJS.ErrnoException
    enoent.code = 'ENOENT'
    vi.mocked(readFile).mockRejectedValue(enoent)

    const result = await handleHelp('project', {})

    expect(result.content[0].text).toContain('No documentation available for: project')
  })

  it('should rethrow non-ENOENT errors from readFile', async () => {
    const { handleHelp } = await import('../../src/tools/composite/help.js')
    vi.mocked(pathExists).mockResolvedValue(true)
    // Mock readFile throwing a different error (e.g., EACCES)
    const eacces = new Error('Permission denied') as NodeJS.ErrnoException
    eacces.code = 'EACCES'
    vi.mocked(readFile).mockRejectedValue(eacces)

    await expect(handleHelp('project', {})).rejects.toThrow('Permission denied')
  })
})
