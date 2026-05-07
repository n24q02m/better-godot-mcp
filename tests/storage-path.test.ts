import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies of initServer
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: class MockServer {
    connect = vi.fn().mockResolvedValue(undefined)
  },
}))
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(),
}))
vi.mock('../src/godot/detector.js', () => ({
  detectGodot: vi.fn().mockReturnValue(null),
}))
vi.mock('../src/tools/registry.js', () => ({
  registerTools: vi.fn(),
}))
vi.mock('../package.json', () => ({
  default: { version: '1.0.0' },
}))

describe('storage configuration', () => {
  const originalPlatform = process.platform
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true,
    })
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('should call setConfigPath with LOCALAPPDATA on Windows', async () => {
    Object.defineProperty(process, 'platform', {
      value: 'win32',
      configurable: true,
    })
    process.env.LOCALAPPDATA = 'C:\\Users\\Test\\AppData\\Local'

    const { initServer } = await import('../src/init-server.js')
    await initServer()

    // Verifying success message which indicates setConfigPath was found and called
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Windows config path overridden to C:\\Users\\Test\\AppData\\Local'),
    )
  })

  it('should not attempt to override on non-Windows platforms', async () => {
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      configurable: true,
    })

    const { initServer } = await import('../src/init-server.js')
    await initServer()

    expect(console.error).not.toHaveBeenCalledWith(
      expect.stringMatching(/Windows config path overridden|Failed to override config path/),
    )
  })
})
