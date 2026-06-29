import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { describe, expect, it, vi } from 'vitest'
import { startStdio } from '../../src/transports/stdio.js'

// Mock the SDK
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => {
  const mockConnect = vi.fn().mockResolvedValue(undefined)
  return {
    Server: vi.fn().mockImplementation(
      class {
        connect = mockConnect
      },
    ),
  }
})

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => {
  return {
    StdioServerTransport: vi.fn().mockImplementation(class {}),
  }
})

describe('stdio transport', () => {
  it('should initialize and connect stdio transport', async () => {
    // @ts-expect-error - mock constructor
    const mockServer = new Server({ name: 'test', version: '1.0.0' }, { capabilities: {} })

    await startStdio(mockServer as unknown as Server)

    expect(StdioServerTransport).toHaveBeenCalled()
    expect(mockServer.connect).toHaveBeenCalledWith(expect.any(Object))
  })
})
