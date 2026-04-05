/**
 * Tests for initServer function - Server initialization flow
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
}))

vi.mock('../src/tools/registry.js', () => ({
  registerTools: vi.fn(),
}))

vi.mock('../src/tools/helpers/paths.js', () => ({
  pathExists: vi.fn().mockResolvedValue(true),
}))

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
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('should initialize server and return instance when Godot is detected', async () => {
    const { detectGodot } = await import('../src/godot/detector.js')
    vi.mocked(detectGodot).mockReturnValue({
      path: '/usr/bin/godot',
      version: { major: 4, minor: 3, patch: 0, label: 'stable', raw: '4.3.stable' },
      source: 'path',
    })

    const { initServer } = await import('../src/init-server.js')
    const server = await initServer()

    expect(server).toBeDefined()
    const { registerTools } = await import('../src/tools/registry.js')
    expect(registerTools).toHaveBeenCalledOnce()
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Godot detected'))
  })

  it('should initialize server when Godot is not found', async () => {
    const { detectGodot } = await import('../src/godot/detector.js')
    vi.mocked(detectGodot).mockReturnValue(null)

    const { initServer } = await import('../src/init-server.js')
    await initServer()

    const { registerTools } = await import('../src/tools/registry.js')
    expect(registerTools).toHaveBeenCalledOnce()
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Godot not found'))
  })

  it('should pass correct config when Godot is detected', async () => {
    const { detectGodot } = await import('../src/godot/detector.js')
    const mockVersion = { major: 4, minor: 6, patch: 0, label: 'stable', raw: '4.6.stable' }
    vi.mocked(detectGodot).mockReturnValue({
      path: '/opt/godot',
      version: mockVersion,
      source: 'env',
    })

    const { initServer } = await import('../src/init-server.js')
    await initServer()

    const { registerTools } = await import('../src/tools/registry.js')
    expect(registerTools).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        godotPath: '/opt/godot',
        godotVersion: mockVersion,
      }),
    )
  })

  it('should pass null config when Godot is not found', async () => {
    const { detectGodot } = await import('../src/godot/detector.js')
    vi.mocked(detectGodot).mockReturnValue(null)

    const { initServer } = await import('../src/init-server.js')
    await initServer()

    const { registerTools } = await import('../src/tools/registry.js')
    expect(registerTools).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        godotPath: null,
        godotVersion: null,
      }),
    )
  })

  it('should read and validate GODOT_PROJECT_PATH from environment', async () => {
    const { detectGodot } = await import('../src/godot/detector.js')
    const { pathExists } = await import('../src/tools/helpers/paths.js')
    vi.mocked(detectGodot).mockReturnValue(null)
    vi.mocked(pathExists).mockResolvedValue(true)
    process.env.GODOT_PROJECT_PATH = '/path/to/my/project'

    const { initServer } = await import('../src/init-server.js')
    await initServer()

    const { registerTools } = await import('../src/tools/registry.js')
    expect(registerTools).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        projectPath: '/path/to/my/project',
      }),
    )
    expect(pathExists).toHaveBeenCalledWith(expect.stringContaining('project.godot'))
  })

  it('should throw GodotMCPError when GODOT_PROJECT_PATH is invalid', async () => {
    const { detectGodot } = await import('../src/godot/detector.js')
    const { pathExists } = await import('../src/tools/helpers/paths.js')
    vi.mocked(detectGodot).mockReturnValue(null)
    vi.mocked(pathExists).mockResolvedValue(false)
    process.env.GODOT_PROJECT_PATH = '/invalid/path'

    const { initServer } = await import('../src/init-server.js')
    const { GodotMCPError } = await import('../src/tools/helpers/errors.js')

    await expect(initServer()).rejects.toThrow('Invalid project path')
    expect(console.error).toHaveBeenCalledWith('Failed to initialize server:', expect.any(GodotMCPError))
  })

  it('should pass null projectPath if GODOT_PROJECT_PATH is not set', async () => {
    const { detectGodot } = await import('../src/godot/detector.js')
    vi.mocked(detectGodot).mockReturnValue(null)
    delete process.env.GODOT_PROJECT_PATH

    const { initServer } = await import('../src/init-server.js')
    await initServer()

    const { registerTools } = await import('../src/tools/registry.js')
    expect(registerTools).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        projectPath: null,
      }),
    )
  })

  it('should instantiate Server with correct name, version, and capabilities', async () => {
    const { detectGodot } = await import('../src/godot/detector.js')
    vi.mocked(detectGodot).mockReturnValue(null)

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
    const { detectGodot } = await import('../src/godot/detector.js')
    vi.mocked(detectGodot).mockReturnValue(null)

    const { initServer } = await import('../src/init-server.js')
    await initServer()

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Server started'))
  })

  it('should handle errors during server initialization (connect failure)', async () => {
    const { detectGodot } = await import('../src/godot/detector.js')
    vi.mocked(detectGodot).mockReturnValue(null)

    const testError = new Error('Connection failed')
    mockConnect.mockRejectedValue(testError)

    const { initServer } = await import('../src/init-server.js')

    await expect(initServer()).rejects.toThrow('Connection failed')
    expect(console.error).toHaveBeenCalledWith('Failed to initialize server:', testError)
  })

  it('should handle errors when registerTools fails', async () => {
    const { detectGodot } = await import('../src/godot/detector.js')
    vi.mocked(detectGodot).mockReturnValue(null)

    const { registerTools } = await import('../src/tools/registry.js')
    const testError = new Error('Registration failed')
    vi.mocked(registerTools).mockImplementation(() => {
      throw testError
    })

    const { initServer } = await import('../src/init-server.js')
    await expect(initServer()).rejects.toThrow('Registration failed')
    expect(console.error).toHaveBeenCalledWith('Failed to initialize server:', testError)
  })

  it('should handle errors when detectGodot fails', async () => {
    const { detectGodot } = await import('../src/godot/detector.js')
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

    const { detectGodot } = await import('../src/godot/detector.js')
    vi.mocked(detectGodot).mockReturnValue(null)

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

    const { detectGodot } = await import('../src/godot/detector.js')
    vi.mocked(detectGodot).mockReturnValue(null)

    const { initServer } = await import('../src/init-server.js')
    await initServer()

    expect(mockServerConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        version: '0.0.0',
      }),
      expect.anything(),
    )
  })
})
