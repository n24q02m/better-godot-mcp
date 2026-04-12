/**
 * HTTP Transport
 * Streamable HTTP server on 127.0.0.1 (localhost-only, no auth needed).
 * Uses Node.js built-in http module with StreamableHTTPServerTransport from MCP SDK.
 */

import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import type { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'

const SERVER_NAME = 'better-godot-mcp'

/**
 * Factory that creates a fresh MCP Server instance for each HTTP session.
 * Required because each StreamableHTTPServerTransport session needs its own Server.
 */
export type ServerFactory = () => Server

export async function startHttp(serverFactory: ServerFactory): Promise<void> {
  const port = parseInt(process.env.PORT ?? '0', 10)
  const transports = new Map<string, StreamableHTTPServerTransport>()

  const httpServer = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)

    // Health check
    if (url.pathname === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', mode: 'http', timestamp: new Date().toISOString() }))
      return
    }

    // Only handle /mcp endpoint
    if (url.pathname !== '/mcp') {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Not found' }))
      return
    }

    // Handle MCP requests
    if (req.method === 'POST') {
      const sessionId = req.headers['mcp-session-id'] as string | undefined

      // Existing session
      if (sessionId) {
        const transport = transports.get(sessionId)
        if (transport) {
          await transport.handleRequest(req, res)
          return
        }
      }

      // New session -- read body to check if initialize request
      const chunks: Buffer[] = []
      for await (const chunk of req) {
        chunks.push(chunk as Buffer)
      }
      const body = JSON.parse(Buffer.concat(chunks).toString())

      if (!isInitializeRequest(body)) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Bad request: not an initialize request' },
            id: null,
          }),
        )
        return
      }

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          transports.set(id, transport)
        },
      })

      transport.onclose = () => {
        if (transport.sessionId) {
          transports.delete(transport.sessionId)
        }
      }

      const server = serverFactory()
      await server.connect(transport)
      await transport.handleRequest(req, res, body)
      return
    }

    // GET -- SSE streaming for existing session
    if (req.method === 'GET') {
      const sessionId = req.headers['mcp-session-id'] as string | undefined
      const transport = sessionId ? transports.get(sessionId) : undefined
      if (transport) {
        await transport.handleRequest(req, res)
        return
      }
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Invalid or missing session' }))
      return
    }

    // DELETE -- close session
    if (req.method === 'DELETE') {
      const sessionId = req.headers['mcp-session-id'] as string | undefined
      const transport = sessionId ? transports.get(sessionId) : undefined
      if (transport) {
        await transport.handleRequest(req, res)
        return
      }
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Invalid or missing session' }))
      return
    }

    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Method not allowed' }))
  })

  httpServer.listen(port, '127.0.0.1', () => {
    const addr = httpServer.address()
    const boundPort = typeof addr === 'object' && addr ? addr.port : port
    console.error(`[${SERVER_NAME}] HTTP server listening on http://127.0.0.1:${boundPort}/mcp`)
  })
}
