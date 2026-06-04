/**
 * Centralized logger for Better Godot MCP
 *
 * Uses console.error for all output to avoid interfering with MCP stdio transport.
 */

const PREFIX = '[better-godot-mcp]'

export const logger = {
  info: (message: string, ...args: unknown[]) => {
    console.error(`${PREFIX} ${message}`, ...args)
  },
  warn: (message: string, ...args: unknown[]) => {
    console.error(`${PREFIX} WARN: ${message}`, ...args)
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`${PREFIX} ERROR: ${message}`, ...args)
  },
  debug: (message: string, ...args: unknown[]) => {
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      console.error(`${PREFIX} DEBUG: ${message}`, ...args)
    }
  },
}
