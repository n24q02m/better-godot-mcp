/**
 * Stdio Transport
 * Backward-compatible stdio mode for local MCP clients (Claude Desktop, etc.)
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

export async function startStdio(server: Server): Promise<void> {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}
