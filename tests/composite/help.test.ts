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

  it('should fallback to process.cwd() combinations', async () => {
    const cwd = process.cwd()

    // Test 1: Fallback to cwd/build/src/docs
    vi.mocked(existsSync).mockImplementation((path) => {
      // Simulate finding the 4th directory candidate: join(process.cwd(), 'build', 'src', 'docs')
      const targetDir = join(cwd, 'build', 'src', 'docs')
      if (typeof path === 'string' && path === targetDir) return true
      // Also return true when searching for the file inside it
      if (typeof path === 'string' && path === join(targetDir, 'project.md')) return true
      return false
    })
    vi.mocked(readFileSync).mockReturnValue('# Build Docs')

    const resultBuild = await handleHelp('project', {})
    expect(resultBuild.content[0].text).toContain('# Build Docs')
    const calledPathBuild = vi.mocked(readFileSync).mock.calls[0][0] as string
    expect(calledPathBuild).toContain(join('build', 'src', 'docs'))

    vi.clearAllMocks()

    // Test 2: Fallback to cwd/src/docs
    vi.mocked(existsSync).mockImplementation((path) => {
      // Here we explicitly return true for cwd/src/docs directory
      const targetDir = join(cwd, 'src', 'docs')
      if (typeof path === 'string' && path === targetDir) return true
      if (typeof path === 'string' && path === join(targetDir, 'project.md')) return true
      return false
    })
    vi.mocked(readFileSync).mockReturnValue('# Src Docs')

    const resultSrc = await handleHelp('project', {})
    expect(resultSrc.content[0].text).toContain('# Src Docs')
    const calledPathSrc = vi.mocked(readFileSync).mock.calls[0][0] as string
    expect(calledPathSrc).toContain(join('src', 'docs'))
  })
})
