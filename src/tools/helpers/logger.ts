import { format } from 'node:util'

/**
 * Centralized logger utility for Better Godot MCP.
 * All logs are written to stderr to avoid interfering with MCP JSON-RPC on stdout.
 */

const SERVER_NAME = 'better-godot-mcp'
const PREFIX = `[${SERVER_NAME}]`

const isDebugEnabled = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development'

/**
 * Internal helper to write formatted logs to stderr.
 */
function emit(message: string, args: unknown[], levelPrefix = ''): void {
  const formattedMessage = format(`${PREFIX}${levelPrefix} ${message}`, ...args)
  process.stderr.write(`${formattedMessage}\n`)
}

export const logger = {
  /**
   * Log an info message.
   */
  info: (message: string, ...args: unknown[]) => {
    emit(message, args)
  },

  /**
   * Log a warning message.
   */
  warn: (message: string, ...args: unknown[]) => {
    emit(message, args, ' WARN:')
  },

  /**
   * Log an error message.
   */
  error: (message: string, ...args: unknown[]) => {
    emit(message, args, ' ERROR:')
  },

  /**
   * Log a debug message (only if debug mode is enabled).
   */
  debug: (message: string, ...args: unknown[]) => {
    if (isDebugEnabled) {
      emit(message, args, ' DEBUG:')
    }
  },
}
