import { format } from 'node:util'

/**
 * Centralized logger utility for Better Godot MCP.
 * All logs are written to stderr to avoid interfering with MCP JSON-RPC on stdout.
 */

const SERVER_NAME = 'better-godot-mcp'
const PREFIX = `[${SERVER_NAME}]`

const isDebugEnabled = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development'

export const logger = {
  /**
   * Log an info message.
   */
  info: (message: string, ...args: unknown[]) => {
    process.stderr.write(`${format(`${PREFIX} ${message}`, ...args)}\n`)
  },

  /**
   * Log a warning message.
   */
  warn: (message: string, ...args: unknown[]) => {
    process.stderr.write(`${format(`${PREFIX} WARN: ${message}`, ...args)}\n`)
  },

  /**
   * Log an error message.
   */
  error: (message: string, ...args: unknown[]) => {
    process.stderr.write(`${format(`${PREFIX} ERROR: ${message}`, ...args)}\n`)
  },

  /**
   * Log a debug message (only if debug mode is enabled).
   */
  debug: (message: string, ...args: unknown[]) => {
    if (isDebugEnabled) {
      process.stderr.write(`${format(`${PREFIX} DEBUG: ${message}`, ...args)}\n`)
    }
  },
}
