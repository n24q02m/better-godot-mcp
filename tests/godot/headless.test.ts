import * as child_process from 'node:child_process'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { execGodotSync } from '../../src/godot/headless.js'

// Mock child_process
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
  spawn: vi.fn(),
}))

describe('headless', () => {
  const godotPath = '/usr/bin/godot'
  const args = ['--version']

  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('execGodotSync', () => {
    it('should return success result when command succeeds', () => {
      vi.mocked(child_process.execSync).mockReturnValue('4.2.1.stable')

      const result = execGodotSync(godotPath, args)

      expect(result).toEqual({
        success: true,
        stdout: '4.2.1.stable',
        stderr: '',
        exitCode: 0,
      })
      expect(child_process.execSync).toHaveBeenCalledWith(
        `"${godotPath}" --version`,
        expect.objectContaining({ encoding: 'utf-8' }),
      )
    })

    it('should return error result when command fails with status', () => {
      const error = new Error('Command failed')
      Object.assign(error, {
        status: 1,
        stdout: 'output',
        stderr: 'error message',
      })
      vi.mocked(child_process.execSync).mockImplementation(() => {
        throw error
      })

      const result = execGodotSync(godotPath, args)

      expect(result).toEqual({
        success: false,
        stdout: 'output',
        stderr: 'error message',
        exitCode: 1,
      })
    })

    it('should handle error with minimal properties', () => {
      const error = new Error('Unknown error')
      // Error object only has message, no status/stdout/stderr
      vi.mocked(child_process.execSync).mockImplementation(() => {
        throw error
      })

      const result = execGodotSync(godotPath, args)

      expect(result).toEqual({
        success: false,
        stdout: '',
        stderr: 'Unknown error',
        exitCode: 1, // Default exit code when status is missing
      })
    })
  })
})
