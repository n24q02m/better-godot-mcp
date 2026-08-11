/**
 * Live contract test for the Godot EditorPlugin's Streamable HTTP client.
 *
 * The server is the built package, not a mocked handler. The request sequence
 * mirrors the GDScript dock: initialize, initialized notification, then the
 * project/info and scenes/list tool calls with the issued session header.
 */

import { type ChildProcess, spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const MCP_PROTOCOL_VERSION = '2025-11-25'
const FIXTURE_PROJECT = resolve('tests/godot/fixtures/editor-plugin-project')

type JsonObject = Record<string, unknown>

let serverProcess: ChildProcess | undefined
let endpoint = ''
let sessionId = ''
let requestId = 0

function parseMcpPayload(body: string): JsonObject {
  const eventData = body
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice('data:'.length).trim())
    .filter((line) => line.length > 0 && line !== '[DONE]')
    .at(-1)

  return JSON.parse(eventData ?? body) as JsonObject
}

function stopProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return Promise.resolve()

  return new Promise((resolveStop) => {
    const timer = setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL')
      resolveStop()
    }, 5_000)
    child.once('exit', () => {
      clearTimeout(timer)
      resolveStop()
    })
    child.kill('SIGTERM')
  })
}

async function startServer(): Promise<void> {
  const output: string[] = []
  const child = spawn(process.execPath, ['bin/cli.mjs', '--http'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      MCP_TRANSPORT: 'http',
      NODE_ENV: 'test',
      PORT: '0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  serverProcess = child

  await new Promise<void>((resolveReady, rejectReady) => {
    const timeout = setTimeout(() => {
      rejectReady(new Error(`HTTP server did not become ready. Output:\n${output.join('')}`))
    }, 30_000)

    const onData = (chunk: Buffer | string) => {
      const text = chunk.toString()
      output.push(text)
      const match = output.join('').match(/on http:\/\/127\.0\.0\.1:(\d+)\/mcp/)
      if (!match) return
      clearTimeout(timeout)
      endpoint = `http://127.0.0.1:${match[1]}/mcp`
      resolveReady()
    }

    child.stdout?.on('data', onData)
    child.stderr?.on('data', onData)
    child.once('error', (error) => {
      clearTimeout(timeout)
      rejectReady(error)
    })
    child.once('exit', (code) => {
      if (endpoint) return
      clearTimeout(timeout)
      rejectReady(new Error(`HTTP server exited before ready with code ${code}. Output:\n${output.join('')}`))
    })
  })
}

async function postMcp(method: string, params: JsonObject, withResponse = true) {
  const body: JsonObject = { jsonrpc: '2.0', method }
  if (withResponse) {
    requestId += 1
    body.id = requestId
  }
  if (Object.keys(params).length > 0) body.params = params

  const headers: Record<string, string> = {
    Accept: 'application/json, text/event-stream',
    'Content-Type': 'application/json',
    'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
  }
  if (sessionId) headers['Mcp-Session-Id'] = sessionId

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const text = await response.text()
  const responseSessionId = response.headers.get('mcp-session-id')
  if (responseSessionId) sessionId = responseSessionId

  return {
    payload: text.trim().length > 0 ? parseMcpPayload(text) : null,
    response,
    text,
  }
}

describe('Godot EditorPlugin live HTTP contract', () => {
  beforeAll(async () => {
    await startServer()

    const initialized = await postMcp('initialize', {
      capabilities: {},
      clientInfo: { name: 'better-godot-mcp-editor-test', version: '0.1.0' },
      protocolVersion: MCP_PROTOCOL_VERSION,
    })
    expect(initialized.response.status).toBe(200)
    expect(sessionId).not.toBe('')
    expect(initialized.payload?.result).toBeDefined()

    const notification = await postMcp('notifications/initialized', {}, false)
    expect([200, 202, 204]).toContain(notification.response.status)
  }, 30_000)

  afterAll(async () => {
    if (serverProcess) await stopProcess(serverProcess)
  })

  it('calls project/info and scenes/list through the built server', async () => {
    const project = await postMcp('tools/call', {
      arguments: { action: 'info', project_path: FIXTURE_PROJECT },
      name: 'project',
    })
    expect(project.response.status).toBe(200)
    expect(project.payload?.result).toBeDefined()
    expect(JSON.stringify(project.payload)).toContain('Better Godot MCP EditorPlugin Fixture')

    const scenes = await postMcp('tools/call', {
      arguments: { action: 'list', project_path: FIXTURE_PROJECT },
      name: 'scenes',
    })
    expect(scenes.response.status).toBe(200)
    expect(scenes.payload?.result).toBeDefined()
    expect(JSON.stringify(scenes.payload)).toContain('scenes')
  })

  it('rejects a request without a session and an unknown session', async () => {
    const noSession = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/event-stream',
        'Content-Type': 'application/json',
        'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
      },
      body: JSON.stringify({ id: 99, jsonrpc: '2.0', method: 'tools/list' }),
    })
    expect(noSession.status).toBe(400)
    expect(await noSession.text()).toContain('no valid session ID')

    const unknownSession = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/event-stream',
        'Content-Type': 'application/json',
        'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
        'Mcp-Session-Id': 'editor-plugin-missing-session',
      },
      body: JSON.stringify({ id: 100, jsonrpc: '2.0', method: 'tools/list' }),
    })
    expect(unknownSession.status).toBe(404)
    expect(await unknownSession.text()).toContain('Session not found')
  })
})
