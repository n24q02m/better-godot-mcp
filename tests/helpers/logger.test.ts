/**
 * Tests for the logger utility.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it('should log info messages', async () => {
    const { logger } = await import('../../src/tools/helpers/logger.js')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logger.info('test info message')
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('test info message'))
    // Info should not have a label
    expect(spy.mock.calls[0][0]).toMatch(/\[better-godot-mcp\] test info message/)
  })

  it('should log warn messages', async () => {
    const { logger } = await import('../../src/tools/helpers/logger.js')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logger.warn('test warn message')
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('WARN: test warn message'))
  })

  it('should log error messages', async () => {
    const { logger } = await import('../../src/tools/helpers/logger.js')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logger.error('test error message')
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('ERROR: test error message'))
  })

  it('should not log debug messages when DEBUG is not enabled', async () => {
    vi.stubEnv('DEBUG', 'false')
    vi.stubEnv('NODE_ENV', 'test')

    const { logger } = await import('../../src/tools/helpers/logger.js')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logger.debug('test debug message')
    expect(spy).not.toHaveBeenCalled()
  })

  it('should log debug messages when DEBUG is true', async () => {
    vi.stubEnv('DEBUG', 'true')

    const { logger } = await import('../../src/tools/helpers/logger.js')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logger.debug('test debug message')
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('DEBUG: test debug message'))
  })

  it('should log debug messages when NODE_ENV is development', async () => {
    vi.stubEnv('DEBUG', 'false')
    vi.stubEnv('NODE_ENV', 'development')

    const { logger } = await import('../../src/tools/helpers/logger.js')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logger.debug('test debug message')
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('DEBUG: test debug message'))
  })

  it('should pass additional arguments to console.error', async () => {
    const { logger } = await import('../../src/tools/helpers/logger.js')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const data = { foo: 'bar' }
    logger.info('message', data, 123)
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('message'), data, 123)
  })

  it('should be case-sensitive for DEBUG environment variable', async () => {
    vi.stubEnv('DEBUG', 'TRUE')
    vi.stubEnv('NODE_ENV', 'production')

    const { logger } = await import('../../src/tools/helpers/logger.js')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logger.debug('test debug message')
    expect(spy).not.toHaveBeenCalled()
  })

  it('should not enable debug for numeric strings like "1"', async () => {
    vi.stubEnv('DEBUG', '1')
    vi.stubEnv('NODE_ENV', 'production')

    const { logger } = await import('../../src/tools/helpers/logger.js')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logger.debug('test debug message')
    expect(spy).not.toHaveBeenCalled()
  })

  it('should handle undefined environment variables gracefully', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: needed to test undefined env vars
    vi.stubEnv('DEBUG', undefined as any)
    // biome-ignore lint/suspicious/noExplicitAny: needed to test undefined env vars
    vi.stubEnv('NODE_ENV', undefined as any)

    const { logger } = await import('../../src/tools/helpers/logger.js')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    logger.debug('test debug message')
    expect(spy).not.toHaveBeenCalled()

    logger.info('still works')
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('still works'))
  })

  it('should handle circular references in arguments', async () => {
    const { logger } = await import('../../src/tools/helpers/logger.js')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const circular: Record<string, unknown> = { name: 'circular' }
    circular.self = circular

    // console.error handles this, we just want to ensure our wrapper doesn't throw
    expect(() => logger.info('circular test', circular)).not.toThrow()
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('circular test'), circular)
  })
})
