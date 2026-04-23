/**
 * Tests for initServer function - Server initialization flow
 * Tests both stdio proxy and HTTP transport modes.
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

// Mock mcp-core runLocalServer and runSmartStdioProxy
const mockStartHttp = vi.fn().mockResolvedValue({
  host: '127.0.0.1',
  port: 12345,
  close: vi.fn().mockResolvedValue(undefined),
})
vi.mock('@n24q02m/mcp-core', () => ({
  runLocalServer: (...args: unknown[]) => mockStartHttp(...args),
}))

const mockRunSmartStdioProxy = vi.fn().mockResolvedValue(0)
vi.mock('@n24q02m/mcp-core/transport', () => ({
  runSmartStdioProxy: (...args: unknown[]) => mockRunSmartStdioProxy(...args),
}))

let exitSpy: ReturnType<typeof vi.spyOn>

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
    mockRunSmartStdioProxy.mockResolvedValue(0)
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)
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
    it('should default to HTTP mode when no flags are set', async () => {
      const { detectGodot } = await import('../src/godot/detector.js')
      vi.mocked(detectGodot).mockReturnValue(null)
      delete process.env.MCP_TRANSPORT

      const { initServer } = await import('../src/init-server.js')
      await runHttpInit(initServer)

      expect(mockStartHttp).toHaveBeenCalledOnce()
      expect(mockRunSmartStdioProxy).not.toHaveBeenCalled()
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('HTTP mode'))
    })

    it('should use stdio proxy mode when --stdio flag is passed', async () => {
      const { detectGodot } = await import('../src/godot/detector.js')
      vi.mocked(detectGodot).mockReturnValue(null)
      process.argv = [...originalArgv, '--stdio']

      const { initServer } = await import('../src/init-server.js')
      await initServer()

      expect(mockRunSmartStdioProxy).toHaveBeenCalledOnce()
      expect(mockStartHttp).not.toHaveBeenCalled()
      expect(exitSpy).toHaveBeenCalledWith(0)
    })

    it('should use stdio proxy mode when MCP_TRANSPORT=stdio', async () => {
      const { detectGodot } = await import('../src/godot/detector.js')
      vi.mocked(detectGodot).mockReturnValue(null)
      process.env.MCP_TRANSPORT = 'stdio'

      const { initServer } = await import('../src/init-server.js')
      await initServer()

      expect(mockRunSmartStdioProxy).toHaveBeenCalledOnce()
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
    it('should handle errors during server initialization (stdio proxy failure)', async () => {
      const { detectGodot } = await import('../src/godot/detector.js')
      vi.mocked(detectGodot).mockReturnValue(null)
      process.env.MCP_TRANSPORT = 'stdio'

      const testError = new Error('Proxy failed')
      mockRunSmartStdioProxy.mockRejectedValue(testError)

      const { initServer } = await import('../src/init-server.js')

      await expect(initServer()).rejects.toThrow('Proxy failed')
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
