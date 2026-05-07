/**
 * Tests for initServer function - Server initialization flow
 * Tests both stdio proxy and HTTP transport modes.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockServerConstructor = vi.fn()
const mockConnect = vi.fn().mockResolvedValue(undefined)
const mockSetRequestHandler = vi.fn()
const mockStdioTransportConstructor = vi.fn()

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
  class MockStdioServerTransport {
    constructor(...args: unknown[]) {
      mockStdioTransportConstructor(...args)
    }
  }
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

// Mock mcp-core runHttpServer (stdio path uses StdioServerTransport directly)
const mockStartHttp = vi.fn().mockResolvedValue({
  host: '127.0.0.1',
  port: 12345,
  close: vi.fn().mockResolvedValue(undefined),
})
vi.mock('@n24q02m/mcp-core', () => ({
  runHttpServer: (...args: unknown[]) => mockStartHttp(...args),
}))

describe('initServer', () => {
  const originalEnv = process.env
  const originalArgv = process.argv

  beforeEach(() => {
    vi.clearAllMocks()
    mockConnect.mockResolvedValue(undefined)
    mockStartHttp.mockResolvedValue({
      host: '127.0.0.1',
      port: 12345,
      close: vi.fn().mockResolvedValue(undefined),
    })
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)
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

  const runHttpInit = async (initServer: () => Promise<void>): Promise<void> => {
    const done = initServer()
    await new Promise((r) => setImmediate(r))
    await new Promise((r) => setImmediate(r))
    process.emit('SIGINT')
    await done
  }

  describe('transport mode selection', () => {
    it('should default to stdio mode when no flags are set', async () => {
      const { detectGodot } = await import('../src/godot/detector.js')
      vi.mocked(detectGodot).mockResolvedValue(null)
      delete process.env.MCP_TRANSPORT
      delete process.env.TRANSPORT_MODE

      const { initServer } = await import('../src/init-server.js')
      await initServer()

      expect(mockStdioTransportConstructor).toHaveBeenCalledOnce()
      expect(mockConnect).toHaveBeenCalledOnce()
      expect(mockStartHttp).not.toHaveBeenCalled()
    })

    it('should use HTTP mode when --http flag is passed', async () => {
      const { detectGodot } = await import('../src/godot/detector.js')
      vi.mocked(detectGodot).mockResolvedValue(null)
      process.argv = [...originalArgv, '--http']

      const { initServer } = await import('../src/init-server.js')
      await runHttpInit(initServer)

      expect(mockStartHttp).toHaveBeenCalledOnce()
      expect(mockStdioTransportConstructor).not.toHaveBeenCalled()
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('HTTP mode'))
    })

    it('should use HTTP mode when MCP_TRANSPORT=http', async () => {
      const { detectGodot } = await import('../src/godot/detector.js')
      vi.mocked(detectGodot).mockResolvedValue(null)
      process.env.MCP_TRANSPORT = 'http'

      const { initServer } = await import('../src/init-server.js')
      await runHttpInit(initServer)

      expect(mockStartHttp).toHaveBeenCalledOnce()
      expect(mockStdioTransportConstructor).not.toHaveBeenCalled()
    })

    it('should use HTTP mode when TRANSPORT_MODE=http', async () => {
      const { detectGodot } = await import('../src/godot/detector.js')
      vi.mocked(detectGodot).mockResolvedValue(null)
      process.env.TRANSPORT_MODE = 'http'

      const { initServer } = await import('../src/init-server.js')
      await runHttpInit(initServer)

      expect(mockStartHttp).toHaveBeenCalledOnce()
      expect(mockStdioTransportConstructor).not.toHaveBeenCalled()
    })

    it('should pass server factory and options to runHttpServer in HTTP mode', async () => {
      const { detectGodot } = await import('../src/godot/detector.js')
      vi.mocked(detectGodot).mockResolvedValue(null)
      process.env.MCP_TRANSPORT = 'http'

      const { initServer } = await import('../src/init-server.js')
      await runHttpInit(initServer)

      expect(mockStartHttp).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ serverName: 'better-godot-mcp' }),
      )
    })
  })

  describe('createGodotServer', () => {
    it('should initialize server when Godot is detected', async () => {
      const { createGodotServer } = await import('../src/init-server.js')
      createGodotServer({
        path: '/usr/bin/godot',
        version: { major: 4, minor: 3, patch: 0, label: 'stable', raw: '4.3.stable' },
        source: 'path',
      })

      const { registerTools } = await import('../src/tools/registry.js')
      expect(registerTools).toHaveBeenCalledOnce()
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Godot detected'))
    })

    it('should initialize server when Godot is not found', async () => {
      const { createGodotServer } = await import('../src/init-server.js')
      createGodotServer(null)

      const { registerTools } = await import('../src/tools/registry.js')
      expect(registerTools).toHaveBeenCalledOnce()
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Godot not found'))
    })

    it('should instantiate Server with correct name, version, and capabilities', async () => {
      const { createGodotServer } = await import('../src/init-server.js')
      createGodotServer(null)

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
      vi.mocked(detectGodot).mockResolvedValue(null)
      process.env.MCP_TRANSPORT = 'stdio'

      const testError = new Error('Connect failed')
      mockConnect.mockRejectedValueOnce(testError)

      const { initServer } = await import('../src/init-server.js')

      await expect(initServer()).rejects.toThrow('Connect failed')
      expect(console.error).toHaveBeenCalledWith('Failed to initialize server:', testError)
    })

    it('should handle errors during HTTP startup', async () => {
      const { detectGodot } = await import('../src/godot/detector.js')
      vi.mocked(detectGodot).mockResolvedValue(null)
      process.env.MCP_TRANSPORT = 'http'

      const testError = new Error('Port in use')
      mockStartHttp.mockRejectedValue(testError)

      const { initServer } = await import('../src/init-server.js')

      await expect(initServer()).rejects.toThrow('Port in use')
      expect(console.error).toHaveBeenCalledWith('Failed to initialize server:', testError)
    })
  })

  describe('getVersion', () => {
    it('should return version from package.json', async () => {
      const { createGodotServer } = await import('../src/init-server.js')
      createGodotServer(null)

      expect(mockServerConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          version: '1.2.3',
        }),
        expect.anything(),
      )
    })
  })
})
