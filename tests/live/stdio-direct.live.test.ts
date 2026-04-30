/**
 * Tests for stdio direct mode (MCP SDK StdioServerTransport).
 *
 * Spawns the built CLI with `MCP_TRANSPORT=stdio` and verifies the server
 * responds to a JSON-RPC `initialize` request directly over stdio (no daemon
 * proxy hop). See spec `2026-04-30-multi-mode-stdio-http-architecture.md`
 * Task 3.3 for the rationale (1-Daemon -> Direct stdio refactor).
 */

import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const CLI_PATH = resolve(__dirname, '..', 'bin', 'cli.mjs')

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: number
  result?: {
    serverInfo: { name: string; version: string }
    capabilities: Record<string, unknown>
    protocolVersion: string
  }
  error?: { code: number; message: string }
}

describe('stdio direct mode', () => {
  it('responds to initialize over stdio with correct serverInfo', async () => {
    const proc = spawn(process.execPath, [CLI_PATH], {
      env: { ...process.env, MCP_TRANSPORT: 'stdio' },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    try {
      const initReq = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-11-25',
          capabilities: {},
          clientInfo: { name: 'stdio-direct-test', version: '1.0.0' },
        },
      })

      proc.stdin.write(`${initReq}\n`)

      const responseLine = await new Promise<string>((resolveLine, rejectLine) => {
        let buf = ''
        const timer = setTimeout(() => rejectLine(new Error('timeout waiting for stdio response')), 15_000)
        proc.stdout.on('data', (chunk: Buffer) => {
          buf += chunk.toString('utf8')
          const newlineIdx = buf.indexOf('\n')
          if (newlineIdx !== -1) {
            clearTimeout(timer)
            resolveLine(buf.slice(0, newlineIdx))
          }
        })
        proc.once('error', (err) => {
          clearTimeout(timer)
          rejectLine(err)
        })
        proc.once('exit', (code) => {
          clearTimeout(timer)
          if (!buf) rejectLine(new Error(`process exited with code ${code} before responding`))
        })
      })

      const parsed = JSON.parse(responseLine) as JsonRpcResponse
      expect(parsed.id).toBe(1)
      expect(parsed.result).toBeDefined()
      expect(parsed.result?.serverInfo.name).toBe('better-godot-mcp')
    } finally {
      proc.kill('SIGTERM')
      await new Promise<void>((r) => {
        if (proc.exitCode !== null) return r()
        proc.once('exit', () => r())
      })
    }
  }, 30_000)
})
