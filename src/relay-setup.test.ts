import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ensureConfig, parseRelayConfig } from './relay-setup.js'

// Mock mcp-relay-core modules
vi.mock('@n24q02m/mcp-relay-core/storage', () => ({
  resolveConfig: vi.fn(),
}))
vi.mock('@n24q02m/mcp-relay-core/relay', () => ({
  createSession: vi.fn(),
  pollForResult: vi.fn(),
}))
vi.mock('@n24q02m/mcp-relay-core', () => ({
  writeConfig: vi.fn(),
}))

import { writeConfig } from '@n24q02m/mcp-relay-core'
import { createSession, pollForResult } from '@n24q02m/mcp-relay-core/relay'
import { resolveConfig } from '@n24q02m/mcp-relay-core/storage'

describe('parseRelayConfig', () => {
  it('parses project_path only', () => {
    const result = parseRelayConfig({ project_path: '/home/user/my-game' })
    expect(result).toEqual({
      projectPath: '/home/user/my-game',
      godotPath: null,
    })
  })

  it('parses project_path and godot_path', () => {
    const result = parseRelayConfig({
      project_path: '/home/user/my-game',
      godot_path: '/usr/bin/godot4',
    })
    expect(result).toEqual({
      projectPath: '/home/user/my-game',
      godotPath: '/usr/bin/godot4',
    })
  })

  it('treats empty godot_path as null', () => {
    const result = parseRelayConfig({ project_path: '/path', godot_path: '' })
    expect(result.godotPath).toBeNull()
  })

  it('throws when project_path is missing', () => {
    expect(() => parseRelayConfig({ godot_path: '/usr/bin/godot4' })).toThrow('missing required field: project_path')
  })

  it('throws when project_path is empty', () => {
    expect(() => parseRelayConfig({ project_path: '' })).toThrow('missing required field: project_path')
  })
})

describe('ensureConfig', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns config from config file', async () => {
    vi.mocked(resolveConfig).mockResolvedValue({
      config: { project_path: '/home/user/game' },
      source: 'file',
    })

    const result = await ensureConfig()

    expect(result).toEqual({ projectPath: '/home/user/game', godotPath: null })
    expect(resolveConfig).toHaveBeenCalledWith('better-godot-mcp', ['project_path'])
    expect(createSession).not.toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('loaded from file'))
  })

  it('returns config with godot_path from config file', async () => {
    vi.mocked(resolveConfig).mockResolvedValue({
      config: { project_path: '/home/user/game', godot_path: '/opt/godot/bin' },
      source: 'file',
    })

    const result = await ensureConfig()

    expect(result).toEqual({ projectPath: '/home/user/game', godotPath: '/opt/godot/bin' })
  })

  it('triggers relay when no config found and returns config', async () => {
    vi.mocked(resolveConfig).mockResolvedValue({ config: null, source: null })
    vi.mocked(createSession).mockResolvedValue({
      sessionId: 'test-session',
      keyPair: {} as unknown as CryptoKeyPair,
      passphrase: 'word1-word2-word3-word4',
      relayUrl: 'https://better-godot-mcp.n24q02m.com/setup?s=test-session#k=key&p=pass',
    })
    vi.mocked(pollForResult).mockResolvedValue({
      project_path: '/home/user/new-game',
    })

    const result = await ensureConfig()

    expect(result).toEqual({ projectPath: '/home/user/new-game', godotPath: null })
    expect(createSession).toHaveBeenCalledWith(
      'https://better-godot-mcp.n24q02m.com',
      'better-godot-mcp',
      expect.objectContaining({ server: 'better-godot-mcp' }),
    )
    expect(writeConfig).toHaveBeenCalledWith('better-godot-mcp', {
      project_path: '/home/user/new-game',
    })
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('saved successfully'))
  })

  it('returns null when relay server is unreachable', async () => {
    vi.mocked(resolveConfig).mockResolvedValue({ config: null, source: null })
    vi.mocked(createSession).mockRejectedValue(new Error('Connection refused'))

    const result = await ensureConfig()

    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cannot reach relay server'))
  })

  it('returns null when relay setup times out', async () => {
    vi.mocked(resolveConfig).mockResolvedValue({ config: null, source: null })
    vi.mocked(createSession).mockResolvedValue({
      sessionId: 'test-session',
      keyPair: {} as unknown as CryptoKeyPair,
      passphrase: 'word1-word2-word3-word4',
      relayUrl: 'https://better-godot-mcp.n24q02m.com/setup?s=test',
    })
    vi.mocked(pollForResult).mockRejectedValue(new Error('Relay setup timed out'))

    const result = await ensureConfig()

    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('timed out'))
  })

  it('logs relay URL to stderr for user visibility', async () => {
    vi.mocked(resolveConfig).mockResolvedValue({ config: null, source: null })
    const relayUrl = 'https://better-godot-mcp.n24q02m.com/setup?s=abc#k=key&p=pass'
    vi.mocked(createSession).mockResolvedValue({
      sessionId: 'abc',
      keyPair: {} as unknown as CryptoKeyPair,
      passphrase: 'test',
      relayUrl,
    })
    vi.mocked(pollForResult).mockResolvedValue({
      project_path: '/tmp/game',
    })

    await ensureConfig()

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(relayUrl))
  })
})
