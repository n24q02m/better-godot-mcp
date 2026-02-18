/**
 * Better Godot MCP Server Starter
 * Development entry point
 */

import { initServer } from '../src/init-server.js'

async function startServer() {
  try {
    await initServer()

    // Keep process running
    process.on('SIGINT', () => {
      console.error('\nShutting down Better Godot MCP Server')
      process.exit(0)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
