/**
 * Better Godot MCP Server Starter
 * Development entry point
 */

import { initServer } from '../src/init-server.js'
import { logger } from '../src/tools/helpers/logger.js'

async function startServer() {
  try {
    await initServer()

    // Keep process running
    process.on('SIGINT', () => {
      logger.info('\nShutting down Better Godot MCP Server')
      process.exit(0)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

async function main() {
  const sub = process.argv[2]
  if (sub === 'detect' || sub === 'doctor') {
    const { runGodotCli } = await import('../src/godot-cli.js')
    process.exit(await runGodotCli(sub))
  }
  await startServer()
}

main()
