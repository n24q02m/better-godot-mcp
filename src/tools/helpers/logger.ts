/**
 * Centralized logger utility for Better Godot MCP.
 * All logs are written to stderr to avoid interfering with MCP JSON-RPC on stdout.
 */

import { format } from 'node:util'

const SERVER_NAME = 'better-godot-mcp'
const PREFIX = `[${SERVER_NAME}]`

const isDebugEnabled = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development'

/**
 * Internal helper to write formatted messages to stderr.
 */
function writeToStderr(message: string, ...args: unknown[]) {
  process.stderr.write(`${format(message, ...args)}\n`)
}

export const logger = {
  /**
   * Log an info message.
   */
  info: (message: string, ...args: unknown[]) => {
    writeToStderr(`${PREFIX} ${message}`, ...args)
  },

  /**
   * Log a warning message.
   */
  warn: (message: string, ...args: unknown[]) => {
    writeToStderr(`${PREFIX} WARN: ${message}`, ...args)
  },

  /**
   * Log an error message.
   */
  error: (message: string, ...args: unknown[]) => {
    writeToStderr(`${PREFIX} ERROR: ${message}`, ...args)
  },

  /**
   * Log a debug message (only if debug mode is enabled).
   */
  debug: (message: string, ...args: unknown[]) => {
    if (isDebugEnabled) {
      writeToStderr(`${PREFIX} DEBUG: ${message}`, ...args)
    }
  },
}
