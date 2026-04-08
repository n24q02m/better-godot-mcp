/**
 * Tests for initServer function - Server initialization flow
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { detectGodot } from '../src/godot/detector.js'
import { pathExists } from '../src/tools/helpers/paths.js'
import { registerTools } from '../src/tools/registry.js'

const mockServerConstructor = vi.fn()
const mockConnect = vi.fn().mockResolvedValue(undefined)

// Mock all dependencies before importing
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => {
  class MockServer {
    constructor(...args: unknown[]) {
      mockServerConstructor(...args)
    }
    setRequestHandler = vi.fn()
    connect = mockConnect
  }
  return {
    Server: MockServer,
  }
})

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => {
  class MockStdioServerTransport {}
  return {
    StdioServerTransport: MockStdioServerTransport,
  }
})

vi.mock('../src/godot/detector.js', () => ({
  detectGodot: vi.fn(),
  parseGodotVersion: vi.fn(),
  isVersionSupported: vi.fn(),
  tryGetVersion: vi.fn(),
  isExecutable: vi.fn(),
}))

vi.mock('../src/tools/registry.js', () => ({
  registerTools: vi.fn(),
}))

vi.mock('../src/tools/helpers/paths.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/tools/helpers/paths.js')>()
  return {
    ...actual,
    pathExists: vi.fn().mockResolvedValue(true),
  }
})

// Mock node:fs to test getVersion catch block
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    readFileSync: vi.fn(actual.readFileSync),
  }
})

describe('initServer', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetAllMocks()
    mockConnect.mockResolvedValue(undefined)
    // Suppress console.error output during tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
    process.env = { ...originalEnv }

    // Default mocks
    vi.mocked(pathExists).mockResolvedValue(true)
    vi.mocked(detectGodot).mockReturnValue(null)
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('should initialize server when Godot is detected', async () => {
    vi.mocked(detectGodot).mockReturnValue({
      path: '/usr/bin/godot',
      version: { major: 4, minor: 3, patch: 0, label: 'stable', raw: '4.3.stable' },
      source: 'path',
    })

    const { initServer } = await import('../src/init-server.js')
    await initServer()

    expect(registerTools).toHaveBeenCalledOnce()
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Godot detected'))
  })

  it('should initialize server when Godot is not found', async () => {
    vi.mocked(detectGodot).mockReturnValue(null)

    const { initServer } = await import('../src/init-server.js')
    await initServer()

    expect(registerTools).toHaveBeenCalledOnce()
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Godot not found'))
  })

  it('should pass correct config when Godot is detected', async () => {
    const mockVersion = { major: 4, minor: 6, patch: 0, label: 'stable', raw: '4.6.stable' }
    vi.mocked(detectGodot).mockReturnValue({
      path: '/opt/godot',
      version: mockVersion,
      source: 'env',
    })

    const { initServer } = await import('../src/init-server.js')
    await initServer()

    expect(registerTools).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        godotPath: '/opt/godot',
        godotVersion: mockVersion,
      }),
    )
  })

  it('should pass null config when Godot is not found', async () => {
    vi.mocked(detectGodot).mockReturnValue(null)

    const { initServer } = await import('../src/init-server.js')
    await initServer()

    expect(registerTools).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        godotPath: null,
        godotVersion: null,
      }),
    )
  })

  it('should read GODOT_PROJECT_PATH from environment', async () => {
    process.env.GODOT_PROJECT_PATH = '/path/to/my/project'
    vi.mocked(pathExists).mockResolvedValue(true)

    const { initServer } = await import('../src/init-server.js')
    await initServer()

    expect(registerTools).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        projectPath: '/path/to/my/project',
      }),
    )
  })

  it('should pass null projectPath if GODOT_PROJECT_PATH is not set', async () => {
    delete process.env.GODOT_PROJECT_PATH

    const { initServer } = await import('../src/init-server.js')
    await initServer()

    expect(registerTools).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        projectPath: null,
      }),
    )
  })

  it('should instantiate Server with correct name, version, and capabilities', async () => {
    const { initServer } = await import('../src/init-server.js')
    await initServer()

    expect(mockServerConstructor).toHaveBeenCalledWith(
      {
        name: 'better-godot-mcp',
        version: expect.any(String),
      },
      {
        capabilities: {
          tools: {},
        },
      },
    )
  })

  it('should connect server transport and log server started', async () => {
    const { initServer } = await import('../src/init-server.js')
    await initServer()

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Server started'))
  })

  it('should handle errors during server initialization (connect failure)', async () => {
    const testError = new Error('Connection failed')
    mockConnect.mockRejectedValue(testError)

    const { initServer } = await import('../src/init-server.js')

    await expect(initServer()).rejects.toThrow('Connection failed')
    expect(console.error).toHaveBeenCalledWith('Failed to initialize server:', testError)
  })

  it('should handle errors when registerTools fails', async () => {
    const testError = new Error('Registration failed')
    vi.mocked(registerTools).mockImplementation(() => {
      throw testError
    })

    const { initServer } = await import('../src/init-server.js')
    await expect(initServer()).rejects.toThrow('Registration failed')
    expect(console.error).toHaveBeenCalledWith('Failed to initialize server:', testError)
  })

  it('should handle errors when detectGodot fails', async () => {
    const testError = new Error('Detection failed')
    vi.mocked(detectGodot).mockImplementation(() => {
      throw testError
    })

    const { initServer } = await import('../src/init-server.js')
    await expect(initServer()).rejects.toThrow('Detection failed')
    expect(console.error).toHaveBeenCalledWith('Failed to initialize server:', testError)
  })

  it('should handle missing version in package.json', async () => {
    const { readFileSync } = await import('node:fs')
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({}))

    const { initServer } = await import('../src/init-server.js')
    await initServer()

    expect(mockServerConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        version: '0.0.0',
      }),
      expect.anything(),
    )
  })

  it('should handle errors in getVersion by returning default version', async () => {
    const { readFileSync } = await import('node:fs')
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error('File not found')
    })

    const { initServer } = await import('../src/init-server.js')
    await initServer()

    expect(mockServerConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        version: '0.0.0',
      }),
      expect.anything(),
    )
  })

  it('should handle invalid GODOT_PROJECT_PATH', async () => {
    vi.mocked(pathExists).mockResolvedValue(false)
    process.env.GODOT_PROJECT_PATH = '/invalid/path'

    const { initServer } = await import('../src/init-server.js')
    await expect(initServer()).rejects.toThrow('Invalid GODOT_PROJECT_PATH')
    expect(console.error).toHaveBeenCalledWith(
      'Failed to initialize server:',
      expect.objectContaining({ code: 'PROJECT_NOT_FOUND' }),
    )
  })
})
