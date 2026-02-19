import { describe, expect, it, vi } from 'vitest'
import { makeConfig } from '../fixtures.js'

// Mock child_process
vi.mock('node:child_process', () => {
  return {
    exec: (
      cmd: string,
      options: unknown | ((error: Error | null, stdout: string, stderr: string) => void),
      callback?: (error: Error | null, stdout: string, stderr: string) => void,
    ) => {
      // Handle optional options argument
      let cb = callback
      if (typeof options === 'function') {
        cb = options as (error: Error | null, stdout: string, stderr: string) => void
      }

      // Mock success
      if (cmd.includes('tasklist') || cmd.includes('pgrep')) {
        // Return fake process list
        const output =
          process.platform === 'win32' ? '"godot.exe","1234","Console","1","12,345 K"' : '1234 godot'
        cb?.(null, output, '')
      } else {
        cb?.(new Error(`Unknown command: ${cmd}`), '', '')
      }
      return { unref: () => {} }
    },
    spawn: () => ({ unref: () => {}, pid: 5678 }),
    execSync: () => 'mocked execSync',
  }
})

describe('Editor Tool', () => {
  it('should list running processes', async () => {
    const { handleEditor } = await import('../../src/tools/composite/editor.js')
    const config = makeConfig({ godotPath: '/usr/bin/godot' })

    const result = await handleEditor('status', {}, config)

    const json = JSON.parse(result.content[0].text)
    expect(json.running).toBe(true)
    expect(json.processes).toHaveLength(1)
    expect(json.processes[0].pid).toBe('1234')
  })

  it('should launch editor', async () => {
    const { handleEditor } = await import('../../src/tools/composite/editor.js')
    const config = makeConfig({ godotPath: '/usr/bin/godot', projectPath: '/tmp/project' })

    const result = await handleEditor('launch', { project_path: '/tmp/project' }, config)

    expect(result.content[0].text).toContain('Godot editor launched')
    expect(result.content[0].text).toContain('PID: 5678')
  })
})
