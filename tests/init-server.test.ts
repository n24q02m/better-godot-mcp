/**
 * Tests for initServer function - Server initialization flow
 * Tests both stdio and HTTP transport modes.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockServerConstructor = vi.fn()
const mockConnect = vi.fn().mockResolvedValue(undefined)
const mockSetRequestHandler = vi.fn()

// Mock all dependencies before importing
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => {
  class MockServer {
    constructor(...args: unknown[]) {
      mockServerConstructor(...args)
    }
    setRequestHandler = mockSetRequestHandler
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

// Mock package.json
vi.mock('../package.json', () => ({
  default: {
    version: '1.2.3',
  },
}))

// Mock mcp-core runLocalServer to avoid starting real server.
// init-server.ts dynamically imports '@n24q02m/mcp-core' only for HTTP mode.
const mockStartHttp = vi.fn().mockResolvedValue({
  host: '127.0.0.1',
  port: 12345,
  close: vi.fn().mockResolvedValue(undefined),
})
vi.mock('@n24q02m/mcp-core', () => ({
  runLocalServer: (...args: unknown[]) => mockStartHttp(...args),
}))

// Mock stdio transport
const mockStartStdio = vi.fn().mockResolvedValue(undefined)
vi.mock('../src/transports/stdio.js', () => ({
  startStdio: (...args: unknown[]) => mockStartStdio(...args),
}))

describe('initServer', () => {
  const originalEnv = process.env
  const originalArgv = process.argv

  beforeEach(() => {
    vi.resetAllMocks()
    mockConnect.mockResolvedValue(undefined)
    mockStartHttp.mockResolvedValue({
      host: '127.0.0.1',
      port: 12345,
      close: vi.fn().mockResolvedValue(undefined),
    })
    mockStartStdio.mockResolvedValue(undefined)
    // Suppress console.error output during tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
    process.env = { ...originalEnv }
    process.argv = [...originalArgv]
  })

  afterEach(() => {
    process.env = originalEnv
    process.argv = originalArgv
    vi.restoreAllMocks()
  })

  /**
   * Helper: HTTP mode now blocks on SIGINT/SIGTERM via runLocalServer handle.
   * Tests must trigger shutdown after initServer starts awaiting.
   */
  const runHttpInit = async (initServer: () => Promise<void>): Promise<void> => {
    const done = initServer()
    // Let the mocked runLocalServer resolve + the await chain run.
    await new Promise((r) => setImmediate(r))
    await new Promise((r) => setImmediate(r))
    process.emit('SIGINT')
    await done
  }

  describe('transport mode selection', () => {
    it('should default to HTTP mode when no flags are set', async () => {
      const { detectGodot } = await import('../src/godot/detector.js')
      vi.mocked(detectGodot).mockReturnValue(null)
      delete process.env.MCP_TRANSPORT

      const { initServer } = await import('../src/init-server.js')
      await runHttpInit(initServer)

      expect(mockStartHttp).toHaveBeenCalledOnce()
      expect(mockStartStdio).not.toHaveBeenCalled()
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('HTTP mode'))
    })

    it('should use stdio mode when --stdio flag is passed', async () => {
      const { detectGodot } = await import('../src/godot/detector.js')
      vi.mocked(detectGodot).mockReturnValue(null)
      process.argv = [...originalArgv, '--stdio']

      const { initServer } = await import('../src/init-server.js')
      await initServer()

      expect(mockStartStdio).toHaveBeenCalledOnce()
      expect(mockStartHttp).not.toHaveBeenCalled()
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('stdio mode'))
    })

    it('should use stdio mode when MCP_TRANSPORT=stdio', async () => {
      const { detectGodot } = await import('../src/godot/detector.js')
      vi.mocked(detectGodot).mockReturnValue(null)
      process.env.MCP_TRANSPORT = 'stdio'

      const { initServer } = await import('../src/init-server.js')
      await initServer()

      expect(mockStartStdio).toHaveBeenCalledOnce()
      expect(mockStartHttp).not.toHaveBeenCalled()
    })

    it('should pass server factory and options to runLocalServer in HTTP mode', async () => {
      const { detectGodot } = await import('../src/godot/detector.js')
      vi.mocked(detectGodot).mockReturnValue(null)
      delete process.env.MCP_TRANSPORT

      const { initServer } = await import('../src/init-server.js')
      await runHttpInit(initServer)

      expect(mockStartHttp).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ serverName: 'better-godot-mcp' }),
      )
    })

    it('should pass server instance to startStdio in stdio mode', async () => {
      const { detectGodot } = await import('../src/godot/detector.js')
      vi.mocked(detectGodot).mockReturnValue(null)
      process.env.MCP_TRANSPORT = 'stdio'

      const { initServer } = await import('../src/init-server.js')
      await initServer()

      expect(mockStartStdio).toHaveBeenCalledWith(expect.anything())
    })
  })

  describe('createGodotServer', () => {
    it('should initialize server when Godot is detected', async () => {
      const { detectGodot } = await import('../src/godot/detector.js')
      vi.mocked(detectGodot).mockReturnValue({
        path: '/usr/bin/godot',
        version: { major: 4, minor: 3, patch: 0, label: 'stable', raw: '4.3.stable' },
        source: 'path',
      })

      const { createGodotServer } = await import('../src/init-server.js')
      createGodotServer()

      const { registerTools } = await import('../src/tools/registry.js')
      expect(registerTools).toHaveBeenCalledOnce()
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Godot detected'))
    })

    it('should initialize server when Godot is not found', async () => {
      const { detectGodot } = await import('../src/godot/detector.js')
      vi.mocked(detectGodot).mockReturnValue(null)

      const { createGodotServer } = await import('../src/init-server.js')
      createGodotServer()

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

      const { createGodotServer } = await import('../src/init-server.js')
      createGodotServer()

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

      const { createGodotServer } = await import('../src/init-server.js')
      createGodotServer()

      const { registerTools } = await import('../src/tools/registry.js')
      expect(registerTools).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          godotPath: null,
          godotVersion: null,
        }),
      )
    })

    it('should read GODOT_PROJECT_PATH from environment', async () => {
      const { detectGodot } = await import('../src/godot/detector.js')
      vi.mocked(detectGodot).mockReturnValue(null)
      process.env.GODOT_PROJECT_PATH = '/path/to/my/project'

      const { createGodotServer } = await import('../src/init-server.js')
      createGodotServer()

      const { registerTools } = await import('../src/tools/registry.js')
      expect(registerTools).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          projectPath: '/path/to/my/project',
        }),
      )
    })

    it('should pass null projectPath if GODOT_PROJECT_PATH is not set', async () => {
      const { detectGodot } = await import('../src/godot/detector.js')
      vi.mocked(detectGodot).mockReturnValue(null)
      delete process.env.GODOT_PROJECT_PATH

      const { createGodotServer } = await import('../src/init-server.js')
      createGodotServer()

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

      const { createGodotServer } = await import('../src/init-server.js')
      createGodotServer()

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
  })

  describe('error handling', () => {
    it('should handle errors during server initialization (stdio connect failure)', async () => {
      const { detectGodot } = await import('../src/godot/detector.js')
      vi.mocked(detectGodot).mockReturnValue(null)
      process.env.MCP_TRANSPORT = 'stdio'

      const testError = new Error('Connection failed')
      mockStartStdio.mockRejectedValue(testError)

      const { initServer } = await import('../src/init-server.js')

      await expect(initServer()).rejects.toThrow('Connection failed')
      expect(console.error).toHaveBeenCalledWith('Failed to initialize server:', testError)
    })

    it('should handle errors during HTTP startup', async () => {
      const { detectGodot } = await import('../src/godot/detector.js')
      vi.mocked(detectGodot).mockReturnValue(null)
      delete process.env.MCP_TRANSPORT

      const testError = new Error('Port in use')
      mockStartHttp.mockRejectedValue(testError)

      const { initServer } = await import('../src/init-server.js')

      await expect(initServer()).rejects.toThrow('Port in use')
      expect(console.error).toHaveBeenCalledWith('Failed to initialize server:', testError)
    })

    it('should handle errors when registerTools fails', async () => {
      const { detectGodot } = await import('../src/godot/detector.js')
      vi.mocked(detectGodot).mockReturnValue(null)
      process.env.MCP_TRANSPORT = 'stdio'

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
      process.env.MCP_TRANSPORT = 'stdio'

      const { initServer } = await import('../src/init-server.js')
      await expect(initServer()).rejects.toThrow('Detection failed')
      expect(console.error).toHaveBeenCalledWith('Failed to initialize server:', testError)
    })
  })

  describe('getVersion', () => {
    it('should return version from package.json', async () => {
      const { detectGodot } = await import('../src/godot/detector.js')
      vi.mocked(detectGodot).mockReturnValue(null)

      const { createGodotServer } = await import('../src/init-server.js')
      createGodotServer()

      expect(mockServerConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          version: '1.2.3',
        }),
        expect.anything(),
      )
    })
  })
})
