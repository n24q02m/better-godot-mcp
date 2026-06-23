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
})
