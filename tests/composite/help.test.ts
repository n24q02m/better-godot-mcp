import { readFile } from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handleHelp } from '../../src/tools/composite/help.js'
import { GodotMCPError } from '../../src/tools/helpers/errors.js'
import { pathExists } from '../../src/tools/helpers/paths.js'

const VALID_TOPICS = [
  'animation',
  'audio',
  'editor',
  'input_map',
  'navigation',
  'nodes',
  'physics',
  'project',
  'resources',
  'scenes',
  'scripts',
  'shader',
  'signals',
  'tilemap',
  'ui',
  'config',
  'overview',
] as const

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

  it('should return overview documentation when topic is omitted', async () => {
    vi.mocked(readFile).mockResolvedValue('# Overview Documentation')

    const result = await handleHelp()

    expect(result.content[0].text).toContain('# Overview Documentation')
    const calledPath = vi.mocked(readFile).mock.calls[0][0] as string
    expect(calledPath).toContain('overview.md')
  })

  it('should return documentation for a valid topic', async () => {
    // Mock valid documentation file
    vi.mocked(readFile).mockResolvedValue('# Test Documentation')

    const result = await handleHelp('project')

    expect(result.content[0].text).toContain('# Test Documentation')
    expect(readFile).toHaveBeenCalled()
  })

  it('should never emit structuredContent -- help stays markdown-only, no outputSchema declared', async () => {
    vi.mocked(readFile).mockResolvedValue('# Test Documentation')

    const result = await handleHelp('project')

    expect((result as Record<string, unknown>).structuredContent).toBeUndefined()
  })

  it('should load the requested topic document', async () => {
    vi.mocked(readFile).mockResolvedValue('# Scenes Documentation')

    const result = await handleHelp('scenes')

    expect(result.content[0].text).toContain('# Scenes Documentation')
    // Verify it looked for scenes.md, not help.md
    const calledPath = vi.mocked(readFile).mock.calls[0][0] as string
    expect(calledPath).toContain('scenes.md')
  })

  it('should throw error for invalid topic', async () => {
    await expect(handleHelp('invalid_tool')).rejects.toThrow(GodotMCPError)
    await expect(handleHelp('invalid_tool')).rejects.toThrow('Unknown topic: invalid_tool')
  })

  it('should list valid topics in stable order and reject help aliases', async () => {
    const error = await handleHelp('help').catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(GodotMCPError)
    expect((error as GodotMCPError).suggestion).toBe(`Valid topics: ${VALID_TOPICS.join(', ')}`)
    expect(readFile).not.toHaveBeenCalled()
  })

  it('should reject path traversal without reading outside the docs directory', async () => {
    await expect(handleHelp('../package.json')).rejects.toThrow('Unknown topic: ../package.json')
    await expect(handleHelp('..\\package.json')).rejects.toThrow('Unknown topic: ..\\package.json')
    expect(readFile).not.toHaveBeenCalled()
  })

  it('should return fallback message if documentation file is missing (ENOENT)', async () => {
    // Mock readFile throwing ENOENT (EAFP pattern)
    const enoent = new Error('File not found') as NodeJS.ErrnoException
    enoent.code = 'ENOENT'
    vi.mocked(readFile).mockRejectedValue(enoent)

    const result = await handleHelp('project')

    expect(result.content[0].text).toContain('No documentation available for: project')
  })

  it('should rethrow non-ENOENT errors from readFile', async () => {
    // Mock readFile throwing a different error (e.g., EACCES)
    const eacces = new Error('Permission denied') as NodeJS.ErrnoException
    eacces.code = 'EACCES'
    vi.mocked(readFile).mockRejectedValue(eacces)

    await expect(handleHelp('project')).rejects.toThrow('Permission denied')
  })
})
