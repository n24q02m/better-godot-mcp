import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockServerConstructor = vi.fn()
const mockConnect = vi.fn().mockResolvedValue(undefined)
const mockSetRequestHandler = vi.fn()
const mockStdioTransportConstructor = vi.fn()

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

vi.mock('../package.json', () => ({
  default: {
    version: '1.2.3',
  },
}))

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
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as unknown)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    process.env = { ...originalEnv }
    process.argv = [...originalArgv]
  })

  afterEach(() => {
    process.env = originalEnv
    process.argv = originalArgv
    vi.restoreAllMocks()
  })

  it('should default to stdio mode and await createGodotServer', async () => {
    const { detectGodot } = await import('../src/godot/detector.js')
    vi.mocked(detectGodot).mockResolvedValue(null)

    const { initServer } = await import('../src/init-server.js')
    await initServer()

    expect(mockStdioTransportConstructor).toHaveBeenCalledOnce()
    expect(mockConnect).toHaveBeenCalledOnce()
  })

  describe('createGodotServer', () => {
    it('should initialize server when Godot is detected', async () => {
      const { detectGodot } = await import('../src/godot/detector.js')
      vi.mocked(detectGodot).mockResolvedValue({
        path: '/usr/bin/godot',
        version: { major: 4, minor: 3, patch: 0, label: 'stable', raw: '4.3.stable' },
        source: 'path',
      })

      const { createGodotServer } = await import('../src/init-server.js')
      await createGodotServer()

      const { registerTools } = await import('../src/tools/registry.js')
      expect(registerTools).toHaveBeenCalledOnce()
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Godot detected'))
    })
  })
})
