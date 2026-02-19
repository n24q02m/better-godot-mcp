import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { execSync, spawn } from 'node:child_process'
import { execGodotScript, execGodotSync, launchGodotEditor, runGodotProject } from '../../src/godot/headless.js'

vi.mock('node:child_process', () => {
  return {
    execSync: vi.fn(),
    spawn: vi.fn(),
  }
})

describe('headless', () => {
  const godotPath = '/usr/bin/godot'
  const projectPath = '/path/to/project'
  const scriptPath = 'res://scripts/test.gd'

  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('execGodotSync', () => {
    it('should execute command successfully', () => {
      vi.mocked(execSync).mockReturnValue('success output')

      const result = execGodotSync(godotPath, ['--version'])

      expect(execSync).toHaveBeenCalledWith(
        `"${godotPath}" --version`,
        expect.objectContaining({
          timeout: 30000,
          encoding: 'utf-8',
        })
      )
      expect(result).toEqual({
        success: true,
        stdout: 'success output',
        stderr: '',
        exitCode: 0,
      })
    })

    it('should use provided options', () => {
      vi.mocked(execSync).mockReturnValue('')

      execGodotSync(godotPath, ['--version'], { timeout: 5000, cwd: '/tmp' })

      expect(execSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          timeout: 5000,
          cwd: '/tmp',
        })
      )
    })

    it('should handle execution error', () => {
      const error = new Error('Command failed')
      Object.assign(error, {
        status: 1,
        stdout: 'partial stdout',
        stderr: 'error stderr',
      })
      vi.mocked(execSync).mockImplementation(() => {
        throw error
      })

      const result = execGodotSync(godotPath, ['--version'])

      expect(result).toEqual({
        success: false,
        stdout: 'partial stdout',
        stderr: 'error stderr',
        exitCode: 1,
      })
    })

    it('should handle generic error', () => {
        const error = new Error('Generic error')
        vi.mocked(execSync).mockImplementation(() => {
            throw error
        })

        const result = execGodotSync(godotPath, ['--version'])

        expect(result).toEqual({
            success: false,
            stdout: '',
            stderr: 'Generic error',
            exitCode: 1
        })
    })
  })

  describe('execGodotScript', () => {
    it('should verify argument construction', () => {
        vi.mocked(execSync).mockReturnValue('{}')

        execGodotScript(godotPath, scriptPath, projectPath, ['arg1', 'arg2'])

        expect(execSync).toHaveBeenCalledWith(
            `"${godotPath}" --headless --path ${projectPath} --script ${scriptPath} -- arg1 arg2`,
            expect.any(Object)
        )
    })

    it('should handle no args', () => {
        vi.mocked(execSync).mockReturnValue('{}')

        execGodotScript(godotPath, scriptPath, projectPath)

        expect(execSync).toHaveBeenCalledWith(
            `"${godotPath}" --headless --path ${projectPath} --script ${scriptPath}`,
            expect.any(Object)
        )
    })
  })

  describe('runGodotProject', () => {
    it('should spawn process and unref', () => {
      const mockChild = {
        unref: vi.fn(),
        pid: 12345,
      }
      vi.mocked(spawn).mockReturnValue(mockChild as any)

      const result = runGodotProject(godotPath, projectPath)

      expect(spawn).toHaveBeenCalledWith(
        godotPath,
        ['--path', projectPath],
        expect.objectContaining({
          detached: true,
          stdio: 'ignore',
        })
      )
      expect(mockChild.unref).toHaveBeenCalled()
      expect(result).toEqual({ pid: 12345 })
    })
  })

  describe('launchGodotEditor', () => {
    it('should spawn editor process and unref', () => {
      const mockChild = {
        unref: vi.fn(),
        pid: 67890,
      }
      vi.mocked(spawn).mockReturnValue(mockChild as any)

      const result = launchGodotEditor(godotPath, projectPath)

      expect(spawn).toHaveBeenCalledWith(
        godotPath,
        ['--editor', '--path', projectPath],
        expect.objectContaining({
          detached: true,
          stdio: 'ignore',
        })
      )
      expect(mockChild.unref).toHaveBeenCalled()
      expect(result).toEqual({ pid: 67890 })
    })
  })
})
