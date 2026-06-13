import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logger } from '../../src/tools/helpers/logger.js'

describe('logger helper', () => {
  let stderrWriteSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
  })

  it('should write info logs to stderr with prefix', () => {
    logger.info('test message')
    expect(stderrWriteSpy).toHaveBeenCalledWith('[better-godot-mcp] test message\n')
  })

  it('should write warn logs to stderr with WARN prefix', () => {
    logger.warn('test warning')
    expect(stderrWriteSpy).toHaveBeenCalledWith('[better-godot-mcp] WARN: test warning\n')
  })

  it('should write error logs to stderr with ERROR prefix', () => {
    logger.error('test error')
    expect(stderrWriteSpy).toHaveBeenCalledWith('[better-godot-mcp] ERROR: test error\n')
  })

  it('should format additional arguments', () => {
    logger.info('message %s %d', 'string', 123)
    expect(stderrWriteSpy).toHaveBeenCalledWith('[better-godot-mcp] message string 123\n')
  })

  it('should handle object arguments', () => {
    logger.info('data:', { foo: 'bar' })
    expect(stderrWriteSpy).toHaveBeenCalledWith("[better-godot-mcp] data: { foo: 'bar' }\n")
  })
})
