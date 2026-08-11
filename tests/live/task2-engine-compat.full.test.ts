/**
 * Task 2 live compatibility regression.
 *
 * Spawns the built CLI through the MCP SDK, uses one temporary Godot project,
 * and checks a compact representative-operation matrix. The version case is
 * explicitly skipped when the real Godot executable is unavailable; it never
 * substitutes a mock engine.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTmpProject, createTmpScene, createTmpScript } from '../fixtures.js'

type JsonObject = Record<string, unknown>

interface CompatibilityOperation {
  id: string
  request: {
    name: string
    arguments: Record<string, unknown>
  }
  jsonKeys?: readonly string[]
  arrayField?: string
  arrayIncludes?: string
  arrayObjectPath?: string
  arrayMinLength?: number
  expectedText?: RegExp
  requiresGodot?: boolean
}

const COMPATIBILITY_OPERATIONS: CompatibilityOperation[] = [
  {
    id: 'project.info',
    request: { name: 'project', arguments: { action: 'info' } },
    jsonKeys: ['name', 'mainScene', 'configVersion'],
  },
  {
    id: 'project.version',
    request: { name: 'project', arguments: { action: 'version' } },
    expectedText: /godot/i,
    requiresGodot: true,
  },
  {
    id: 'scenes.list',
    request: { name: 'scenes', arguments: { action: 'list' } },
    jsonKeys: ['count', 'scenes'],
    arrayField: 'scenes',
    arrayIncludes: 'scenes/main.tscn',
  },
  {
    id: 'nodes.list',
    request: { name: 'nodes', arguments: { action: 'list', scene_path: 'scenes/main.tscn' } },
    jsonKeys: ['nodeCount', 'nodes'],
    arrayField: 'nodes',
    arrayMinLength: 1,
  },
  {
    id: 'scripts.list',
    request: { name: 'scripts', arguments: { action: 'list' } },
    jsonKeys: ['count', 'scripts'],
    arrayField: 'scripts',
    arrayIncludes: 'scripts/player.gd',
  },
  {
    id: 'resources.list',
    request: { name: 'resources', arguments: { action: 'list' } },
    jsonKeys: ['count', 'resources'],
    arrayField: 'resources',
    arrayObjectPath: 'resources/theme.tres',
  },
  {
    id: 'project.settings_get',
    request: {
      name: 'project',
      arguments: { action: 'settings_get', key: 'application/config/name' },
    },
    jsonKeys: ['key', 'value'],
  },
  {
    id: 'config.status',
    request: { name: 'config', arguments: { action: 'status' } },
    jsonKeys: ['godot_path', 'godot_version', 'project_path', 'runtime_overrides'],
  },
]

/** Extract the first text content item and remove the server's security wrapper. */
function getText(result: Awaited<ReturnType<Client['callTool']>>, operationId: string): string {
  expect(result.isError ?? false, `${operationId} returned an MCP error`).toBe(false)
  expect(result.content.length, `${operationId} returned no content`).toBeGreaterThan(0)

  const first = result.content[0]
  expect(first?.type, `${operationId} returned a non-text content item`).toBe('text')
  if (first?.type !== 'text') {
    throw new Error(`${operationId} returned an unexpected MCP content shape`)
  }
  expect(first.text.length, `${operationId} returned empty text content`).toBeGreaterThan(0)

  const match = first.text.match(/<untrusted_godot_content>\n([\s\S]*?)\n<\/untrusted_godot_content>/)
  return match?.[1] ?? first.text
}

/** Parse a JSON tool response after asserting its MCP content shape. */
function getJson(result: Awaited<ReturnType<Client['callTool']>>, operationId: string): JsonObject {
  const text = getText(result, operationId)
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw new Error(`${operationId} returned non-JSON content: ${text}`, { cause: error })
  }
  expect(parsed, `${operationId} returned a non-object JSON payload`).toEqual(expect.any(Object))
  return parsed as JsonObject
}

describe('Task 2: current Godot engine compatibility - live', () => {
  let client: Client
  let cleanup = () => {}
  let godotAvailable = false
  let godotUnavailableReason = ''

  beforeAll(async () => {
    const fixture = createTmpProject()
    cleanup = fixture.cleanup
    createTmpScene(fixture.projectPath, 'scenes/main.tscn')
    createTmpScript(fixture.projectPath, 'scripts/player.gd', 'extends Node\n')
    createTmpScript(
      fixture.projectPath,
      'resources/theme.tres',
      '[gd_resource type="Theme" format=3]\n\n[resource]\ndefault_font_size = 16\n',
    )

    const transport = new StdioClientTransport({
      command: 'node',
      args: ['bin/cli.mjs', '--stdio'],
      cwd: process.cwd(),
      env: { ...process.env, MCP_TRANSPORT: 'stdio' } as Record<string, string>,
    })
    client = new Client({ name: 'task2-engine-compat', version: '1.0.0' })
    await client.connect(transport)

    const detection = await client.callTool({
      name: 'config',
      arguments: { action: 'detect_godot' },
    })
    const detectionPayload = getJson(detection, 'config.detect_godot')
    expect(detectionPayload).toHaveProperty('found')

    if (detectionPayload.found === true) {
      godotAvailable = true
      expect(detectionPayload).toHaveProperty('path')
      expect(detectionPayload).toHaveProperty('version')
    } else {
      const suggestions = detectionPayload.suggestions
      godotUnavailableReason = `Godot executable not found; skipped real-engine project.version compatibility check (suggestions: ${JSON.stringify(suggestions)})`
    }

    const setProject = await client.callTool({
      name: 'config',
      arguments: { action: 'set', key: 'project_path', value: fixture.projectPath },
    })
    getText(setProject, 'config.set(project_path)')
  }, 30_000)

  afterAll(async () => {
    await client?.close()
    cleanup()
  })

  it('initializes the built CLI and lists the current 17-tool surface', async () => {
    expect(client.getServerVersion()?.name).toBe('better-godot-mcp')
    expect(client.getServerCapabilities()).toBeDefined()

    const result = await client.listTools()
    const names = result.tools.map((tool) => tool.name)

    expect(result.tools).toHaveLength(17)
    expect(names).toEqual(expect.arrayContaining(['project', 'scenes', 'nodes', 'scripts', 'resources', 'config']))
    for (const tool of result.tools) {
      expect(tool.name.length, 'tools/list returned a tool without a name').toBeGreaterThan(0)
      expect(tool.inputSchema, `tool ${tool.name} is missing inputSchema`).toBeDefined()
    }
  })

  it.each(COMPATIBILITY_OPERATIONS)('$id returns a usable live MCP result', async (operation, context) => {
    if (operation.requiresGodot && !godotAvailable) {
      context.skip(godotUnavailableReason)
      return
    }

    const result = await client.callTool(operation.request)
    if (operation.expectedText) {
      const text = getText(result, operation.id)
      expect(text).toMatch(operation.expectedText)
      return
    }

    const payload = getJson(result, operation.id)
    for (const key of operation.jsonKeys ?? []) {
      expect(payload, `${operation.id} payload missing ${key}`).toHaveProperty(key)
    }

    if (operation.arrayField) {
      const collection = payload[operation.arrayField]
      expect(Array.isArray(collection), `${operation.id}.${operation.arrayField} is not an array`).toBe(true)
      const values = collection as unknown[]
      if (operation.arrayMinLength !== undefined) {
        expect(values.length, `${operation.id}.${operation.arrayField} is empty`).toBeGreaterThanOrEqual(
          operation.arrayMinLength,
        )
      }
      if (operation.arrayIncludes !== undefined) {
        expect(values, `${operation.id}.${operation.arrayField} missed fixture entry`).toContain(
          operation.arrayIncludes,
        )
      }
      if (operation.arrayObjectPath !== undefined) {
        expect(values, `${operation.id}.${operation.arrayField} missed fixture entry`).toEqual(
          expect.arrayContaining([expect.objectContaining({ path: operation.arrayObjectPath })]),
        )
      }
    }
  })
})
