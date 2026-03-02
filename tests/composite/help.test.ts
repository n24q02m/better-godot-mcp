import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
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

  describe('getDocsDir path resolution', () => {
    it('should find docs in the first candidate path', async () => {
      vi.mocked(existsSync).mockImplementation((path: import('node:fs').PathLike) => {
        return (
          path.toString() === join(process.cwd(), 'src', 'docs') ||
          path.toString() === join(process.cwd(), 'src', 'docs', 'project.md')
        )
      })
      vi.mocked(readFileSync).mockReturnValue('# Found Documentation')

      const result = await handleHelp('project', {})
      expect(result.content[0].text).toContain('# Found Documentation')
    })

    it('should find docs in the bundled CLI path', async () => {
      vi.mocked(existsSync).mockImplementation((path: import('node:fs').PathLike) => {
        return (
          path.toString() === join(import.meta.dirname, '..', '..', 'src', 'docs') ||
          path.toString() === join(import.meta.dirname, '..', '..', 'src', 'docs', 'project.md')
        )
      })
      vi.mocked(readFileSync).mockReturnValue('# Found Documentation')

      const result = await handleHelp('project', {})
      expect(result.content[0].text).toContain('# Found Documentation')
    })

    it('should find docs in the cwd src/docs path', async () => {
      vi.mocked(existsSync).mockImplementation((path: import('node:fs').PathLike) => {
        return (
          path.toString().endsWith(join('src', 'docs', 'project.md')) &&
          !path.toString().includes('build') &&
          !path.toString().includes('..')
        )
      })
      vi.mocked(readFileSync).mockReturnValue('# Found Documentation')

      const result = await handleHelp('project', {})
      expect(result.content[0].text).toContain('# Found Documentation')
    })

    it('should find docs in the build/src/docs path', async () => {
      vi.mocked(existsSync).mockImplementation((path: import('node:fs').PathLike) => {
        return path.toString().includes(join('build', 'src', 'docs'))
      })
      vi.mocked(readFileSync).mockReturnValue('# Found Documentation')

      const result = await handleHelp('project', {})
      expect(result.content[0].text).toContain('# Found Documentation')
    })
  })
})
