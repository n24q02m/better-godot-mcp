/**
 * Live MCP protocol tests
 *
 * Spawns the actual MCP server via stdio transport and exercises
 * the full request/response cycle. Tests are environment-agnostic:
 * they pass whether or not Godot is installed on the system.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const ALL_TOOL_NAMES = [
  // P0 - Core (7)
  'project',
  'scenes',
  'nodes',
  'scripts',
  'editor',
  'config',
  'help',
  // P1 - Extended (3)
  'resources',
  'input_map',
  'signals',
  // P2 - Specialized (4)
  'animation',
  'tilemap',
  'shader',
  'physics',
  // P3 - Advanced (3)
  'audio',
  'navigation',
  'ui',
]

/** Extract text from the first content item of a tool result */
function getText(result: Awaited<ReturnType<Client['callTool']>>): string {
  return (result.content as Array<{ type: string; text: string }>)[0]?.text ?? ''
}

describe('MCP Protocol - Live', () => {
  let client: Client
  let transport: StdioClientTransport

  beforeAll(async () => {
    transport = new StdioClientTransport({
      command: 'node',
      args: ['bin/cli.mjs'],
      cwd: process.cwd(),
    })
    client = new Client({ name: 'live-test', version: '1.0.0' })
    await client.connect(transport)
  }, 15_000)

  afterAll(async () => {
    await client.close()
  })

  // -------------------------------------------------------
  // 1. Server starts and responds to initialize
  // -------------------------------------------------------
  it('server starts and exposes tool capabilities', () => {
    // If we got here, the server started successfully via beforeAll
    expect(client).toBeDefined()
  })

  // -------------------------------------------------------
  // 2. tools/list returns all 17 expected tools
  // -------------------------------------------------------
  it('tools/list returns all 17 tools', async () => {
    const result = await client.listTools()
    const names = result.tools.map((t) => t.name).sort()

    expect(names).toHaveLength(17)
    expect(names).toEqual([...ALL_TOOL_NAMES].sort())
  })

  it('every tool has annotations with all 5 fields', async () => {
    const result = await client.listTools()
    for (const tool of result.tools) {
      expect(tool.annotations, `tool "${tool.name}" missing annotations`).toBeDefined()
      const ann = tool.annotations as Record<string, unknown>
      expect(ann).toHaveProperty('title')
      expect(ann).toHaveProperty('readOnlyHint')
      expect(ann).toHaveProperty('destructiveHint')
      expect(ann).toHaveProperty('idempotentHint')
      expect(ann).toHaveProperty('openWorldHint')
    }
  })

  it('every tool has inputSchema with required action field', async () => {
    const result = await client.listTools()
    // All tools except 'help' require 'action'
    for (const tool of result.tools) {
      const schema = tool.inputSchema as Record<string, unknown>
      expect(schema.type).toBe('object')
      if (tool.name === 'help') {
        expect((schema.required as string[]) ?? []).toContain('tool_name')
      } else {
        expect((schema.required as string[]) ?? []).toContain('action')
      }
    }
  })

  // -------------------------------------------------------
  // 3. help tool works and returns useful content
  // -------------------------------------------------------
  it('help tool returns documentation for project', async () => {
    const result = await client.callTool({ name: 'help', arguments: { tool_name: 'project' } })
    const text = getText(result)

    expect(result.isError).toBeFalsy()
    expect(text.length).toBeGreaterThan(50)
    expect(text.toLowerCase()).toContain('project')
  })

  it('help tool rejects unknown topics', async () => {
    const result = await client.callTool({ name: 'help', arguments: { tool_name: 'nonexistent' } })

    expect(result.isError).toBe(true)
    const text = getText(result)
    expect(text.toLowerCase()).toContain('unknown')
  })

  it('help tool works for all P0+P1 tools', async () => {
    const p0p1Tools = [
      'project',
      'scenes',
      'nodes',
      'scripts',
      'editor',
      'config',
      'help',
      'resources',
      'input_map',
      'signals',
    ]

    for (const toolName of p0p1Tools) {
      const result = await client.callTool({ name: 'help', arguments: { tool_name: toolName } })
      expect(result.isError, `help for "${toolName}" returned error`).toBeFalsy()
      const text = getText(result)
      expect(text.length, `help for "${toolName}" should return content`).toBeGreaterThan(10)
    }
  })

  // -------------------------------------------------------
  // 4. config tool returns detection status
  // -------------------------------------------------------
  it('config status returns server configuration', async () => {
    const result = await client.callTool({ name: 'config', arguments: { action: 'status' } })

    expect(result.isError).toBeFalsy()
    const json = JSON.parse(getText(result))

    expect(json).toHaveProperty('godot_path')
    expect(json).toHaveProperty('godot_version')
    expect(json).toHaveProperty('project_path')
    expect(json).toHaveProperty('runtime_overrides')
  })

  it('config.set updates runtime config', async () => {
    const setResult = await client.callTool({
      name: 'config',
      arguments: { action: 'set', key: 'project_path', value: '/tmp/test-project' },
    })
    expect(setResult.isError).toBeFalsy()

    // Verify the update persists
    const statusResult = await client.callTool({ name: 'config', arguments: { action: 'status' } })
    const json = JSON.parse(getText(statusResult))
    expect(json.project_path).toBe('/tmp/test-project')
    expect(json.runtime_overrides.project_path).toBe('/tmp/test-project')
  })

  it('config.set rejects invalid keys', async () => {
    const result = await client.callTool({
      name: 'config',
      arguments: { action: 'set', key: 'invalid_key', value: 'x' },
    })
    expect(result.isError).toBe(true)
    expect(getText(result)).toContain('Invalid config key')
  })

  // -------------------------------------------------------
  // 5. Tools return appropriate responses (with or without Godot)
  // -------------------------------------------------------
  it('config.detect_godot returns structured detection result', async () => {
    const result = await client.callTool({ name: 'config', arguments: { action: 'detect_godot' } })

    expect(result.isError).toBeFalsy()
    const json = JSON.parse(getText(result))
    expect(json).toHaveProperty('found')

    if (json.found) {
      expect(json).toHaveProperty('path')
      expect(json).toHaveProperty('version')
      expect(json).toHaveProperty('source')
    } else {
      expect(json).toHaveProperty('suggestions')
      expect(json.suggestions.length).toBeGreaterThan(0)
    }
  })

  it('config.check returns structured check result', async () => {
    const result = await client.callTool({ name: 'config', arguments: { action: 'check' } })

    expect(result.isError).toBeFalsy()
    const json = JSON.parse(getText(result))
    expect(json).toHaveProperty('godot')
    expect(json.godot).toHaveProperty('found')
    expect(json).toHaveProperty('project')
  })

  it('editor.status returns process info', async () => {
    const result = await client.callTool({ name: 'editor', arguments: { action: 'status' } })

    expect(result.isError).toBeFalsy()
    const json = JSON.parse(getText(result))
    expect(json).toHaveProperty('running')
    expect(json).toHaveProperty('processes')
    expect(json).toHaveProperty('godotPath')
  })

  it('project.info with nonexistent path returns error', async () => {
    const result = await client.callTool({
      name: 'project',
      arguments: { action: 'info', project_path: '/tmp/nonexistent-godot-project-xyz' },
    })

    expect(result.isError).toBe(true)
    const text = getText(result)
    // Should mention project not found or path issue
    expect(text.toLowerCase()).toMatch(/project|path|not found|access denied/)
  })

  it('scenes.list with nonexistent project returns error', async () => {
    const result = await client.callTool({
      name: 'scenes',
      arguments: { action: 'list', project_path: '/tmp/nonexistent-godot-project-xyz' },
    })

    expect(result.isError).toBe(true)
    const text = getText(result)
    expect(text.toLowerCase()).toMatch(/project|path|not found|access denied/)
  })

  it('nodes.list without scene_path returns error', async () => {
    const result = await client.callTool({ name: 'nodes', arguments: { action: 'list' } })

    expect(result.isError).toBe(true)
    const text = getText(result)
    expect(text.toLowerCase()).toMatch(/scene|path|required/)
  })

  it('scripts.list with nonexistent project returns error', async () => {
    const result = await client.callTool({
      name: 'scripts',
      arguments: { action: 'list', project_path: '/tmp/nonexistent-godot-project-xyz' },
    })

    expect(result.isError).toBe(true)
    const text = getText(result)
    expect(text.toLowerCase()).toMatch(/project|path|not found|access denied/)
  })

  // -------------------------------------------------------
  // 6. Corrective errors work (wrong action -> suggestion)
  // -------------------------------------------------------
  it('wrong action on config tool suggests valid actions', async () => {
    const result = await client.callTool({ name: 'config', arguments: { action: 'invalid_action' } })

    expect(result.isError).toBe(true)
    const text = getText(result)
    expect(text).toContain('status')
    expect(text).toContain('set')
  })

  it('typo in scenes action suggests closest match', async () => {
    const result = await client.callTool({ name: 'scenes', arguments: { action: 'crate' } })

    expect(result.isError).toBe(true)
    const text = getText(result)
    expect(text.toLowerCase()).toContain('create')
  })

  it('typo in nodes action suggests closest match', async () => {
    const result = await client.callTool({ name: 'nodes', arguments: { action: 'ad' } })

    expect(result.isError).toBe(true)
    const text = getText(result)
    expect(text.toLowerCase()).toContain('add')
  })

  // -------------------------------------------------------
  // Connection stability
  // -------------------------------------------------------
  it('handles rapid sequential calls without crashing', async () => {
    const calls = Array.from({ length: 5 }, () => client.callTool({ name: 'config', arguments: { action: 'status' } }))

    const results = await Promise.all(calls)
    for (const result of results) {
      expect(result.isError).toBeFalsy()
    }
  })
})
