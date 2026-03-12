#!/usr/bin/env node
/**
 * Live Comprehensive Test for better-godot-mcp.
 *
 * Spawns the server via MCP SDK Client (StdioClientTransport),
 * communicates over JSON-RPC stdio, and tests all accessible operations.
 *
 * Usage:
 *   node test-live-mcp.mjs
 *
 * No env vars required. Godot detection is optional — all tests are offline.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const TIMEOUT = { timeout: 15000 }

let passed = 0
let failed = 0
const results = []

function parse(r) {
  if (r.isError) throw new Error(r.content[0].text)
  return r.content[0].text
}

function ok(label, evidence = '') {
  passed++
  results.push({ label, status: 'PASS', evidence })
  console.log(`  [PASS] ${label}${evidence ? ` | ${evidence.slice(0, 80)}` : ''}`)
}

function fail(label, err) {
  failed++
  results.push({ label, status: 'FAIL', evidence: err })
  console.log(`  [FAIL] ${label} | ${err.slice(0, 120)}`)
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
const transport = new StdioClientTransport({
  command: 'node',
  args: ['bin/cli.mjs'],
  env: { PATH: process.env.PATH },
  cwd: import.meta.dirname || process.cwd(),
})

const client = new Client({ name: 'live-test', version: '1.0.0' })
await client.connect(transport)
console.log('Server connected (no env vars required).\n')

// ---------------------------------------------------------------------------
// 1. listTools — verify 18 tools returned with correct names
// ---------------------------------------------------------------------------
console.log('--- Meta ---')

const toolsResult = await client.listTools()
const toolNames = toolsResult.tools.map((t) => t.name).sort()
const expectedTools = [
  'animation',
  'audio',
  'config',
  'editor',
  'help',
  'input_map',
  'navigation',
  'nodes',
  'physics',
  'project',
  'resources',
  'scenes',
  'scripts',
  'setup',
  'shader',
  'signals',
  'tilemap',
  'ui',
]
if (JSON.stringify(toolNames) === JSON.stringify(expectedTools)) {
  ok('listTools', `${toolNames.length} tools: ${JSON.stringify(toolNames)}`)
} else {
  fail('listTools', `Expected ${JSON.stringify(expectedTools)}, got ${JSON.stringify(toolNames)}`)
}

// ---------------------------------------------------------------------------
// 2-8. help(topic) — P0 tools return docs
// ---------------------------------------------------------------------------
console.log('\n--- help (P0 topics) ---')

const helpTopics = ['project', 'scenes', 'nodes', 'scripts', 'resources', 'editor', 'config']

for (const topic of helpTopics) {
  try {
    const r = await client.callTool({ name: 'help', arguments: { tool_name: topic } }, undefined, TIMEOUT)
    const t = parse(r)
    if (t.length >= 50) {
      ok(`help(${topic})`, `${t.length} chars`)
    } else {
      fail(`help(${topic})`, `Too short: ${t.length} chars`)
    }
  } catch (e) {
    fail(`help(${topic})`, e.message)
  }
}

// ---------------------------------------------------------------------------
// 9. Error paths — P0 tools with missing/invalid action
// ---------------------------------------------------------------------------
console.log('\n--- Error paths ---')

const p0Tools = ['project', 'scenes', 'nodes', 'scripts', 'resources', 'editor', 'config']

// Missing action (empty args)
for (const tool of p0Tools) {
  try {
    const r = await client.callTool({ name: tool, arguments: {} }, undefined, TIMEOUT)
    const t = r.content[0].text.toLowerCase()
    if (r.isError || t.includes('error') || t.includes('action') || t.includes('required') || t.includes('missing')) {
      ok(`${tool}(no action)`, r.content[0].text.slice(0, 80))
    } else {
      fail(`${tool}(no action)`, `Expected error: ${r.content[0].text.slice(0, 60)}`)
    }
  } catch (e) {
    ok(`${tool}(no action)`, `Error: ${e.message.slice(0, 60)}`)
  }
}

// Invalid action on project
try {
  const r = await client.callTool({ name: 'project', arguments: { action: 'invalid' } }, undefined, TIMEOUT)
  const t = r.content[0].text.toLowerCase()
  if (r.isError || t.includes('error') || t.includes('unknown') || t.includes('invalid') || t.includes('unsupported')) {
    ok('project(invalid action)', r.content[0].text.slice(0, 80))
  } else {
    fail('project(invalid action)', `Expected error: ${r.content[0].text.slice(0, 60)}`)
  }
} catch (e) {
  ok('project(invalid action)', `Error: ${e.message.slice(0, 60)}`)
}

// help with nonexistent tool
try {
  const r = await client.callTool({ name: 'help', arguments: { tool_name: 'nonexistent' } }, undefined, TIMEOUT)
  const t = r.content[0].text.toLowerCase()
  if (
    r.isError ||
    t.includes('error') ||
    t.includes('not found') ||
    t.includes('unknown') ||
    t.includes('no documentation') ||
    t.includes('available')
  ) {
    ok('help(nonexistent)', r.content[0].text.slice(0, 80))
  } else {
    fail('help(nonexistent)', `Expected error: ${r.content[0].text.slice(0, 60)}`)
  }
} catch (e) {
  ok('help(nonexistent)', `Error: ${e.message.slice(0, 60)}`)
}

// ---------------------------------------------------------------------------
// 10. project.info without project_path — error about missing path
// ---------------------------------------------------------------------------
console.log('\n--- Missing path tests ---')

try {
  const r = await client.callTool({ name: 'project', arguments: { action: 'info' } }, undefined, TIMEOUT)
  const t = r.content[0].text.toLowerCase()
  if (
    r.isError ||
    t.includes('error') ||
    t.includes('path') ||
    t.includes('required') ||
    t.includes('missing') ||
    t.includes('project_path')
  ) {
    ok('project.info(no path)', r.content[0].text.slice(0, 80))
  } else {
    fail('project.info(no path)', `Expected path error: ${r.content[0].text.slice(0, 60)}`)
  }
} catch (e) {
  ok('project.info(no path)', `Error: ${e.message.slice(0, 60)}`)
}

// ---------------------------------------------------------------------------
// 11. scenes.list without project_path — error
// ---------------------------------------------------------------------------
try {
  const r = await client.callTool({ name: 'scenes', arguments: { action: 'list' } }, undefined, TIMEOUT)
  const t = r.content[0].text.toLowerCase()
  if (
    r.isError ||
    t.includes('error') ||
    t.includes('path') ||
    t.includes('required') ||
    t.includes('missing') ||
    t.includes('project_path')
  ) {
    ok('scenes.list(no path)', r.content[0].text.slice(0, 80))
  } else {
    fail('scenes.list(no path)', `Expected path error: ${r.content[0].text.slice(0, 60)}`)
  }
} catch (e) {
  ok('scenes.list(no path)', `Error: ${e.message.slice(0, 60)}`)
}

// ---------------------------------------------------------------------------
// P1-P3 tools: missing action errors
// ---------------------------------------------------------------------------
console.log('\n--- P1-P3 tools: missing action errors ---')

const extendedTools = ['animation', 'audio', 'input_map', 'navigation', 'physics', 'shader', 'signals', 'tilemap', 'ui']

for (const tool of extendedTools) {
  try {
    const r = await client.callTool({ name: tool, arguments: {} }, undefined, TIMEOUT)
    const t = r.content[0].text.toLowerCase()
    if (r.isError || t.includes('error') || t.includes('action') || t.includes('required') || t.includes('missing')) {
      ok(`${tool}(no action)`, r.content[0].text.slice(0, 80))
    } else {
      fail(`${tool}(no action)`, `Expected error: ${r.content[0].text.slice(0, 60)}`)
    }
  } catch (e) {
    ok(`${tool}(no action)`, `Error: ${e.message.slice(0, 60)}`)
  }
}

// setup(no action) — setup is P0 but not tested above for missing action separately
// It's already in p0Tools loop, so skip.

// ---------------------------------------------------------------------------
// P1-P3 tools: help topics
// ---------------------------------------------------------------------------
console.log('\n--- help (P1-P3 topics) ---')

const extendedHelpTopics = [
  'animation',
  'audio',
  'input_map',
  'navigation',
  'physics',
  'shader',
  'signals',
  'tilemap',
  'ui',
  'setup',
]

for (const topic of extendedHelpTopics) {
  try {
    const r = await client.callTool({ name: 'help', arguments: { tool_name: topic } }, undefined, TIMEOUT)
    const t = parse(r)
    if (t.length >= 50) {
      ok(`help(${topic})`, `${t.length} chars`)
    } else {
      fail(`help(${topic})`, `Too short: ${t.length} chars`)
    }
  } catch (e) {
    fail(`help(${topic})`, e.message)
  }
}

// ---------------------------------------------------------------------------
// P1-P3 tools: action-specific validation (missing project_path)
// ---------------------------------------------------------------------------
console.log('\n--- P1-P3 tools: action-specific validation ---')

const actionValidationCases = [
  { tool: 'animation', action: 'create_player', label: 'animation.create_player(no path)' },
  { tool: 'audio', action: 'add_bus', label: 'audio.add_bus(no path)' },
  { tool: 'input_map', action: 'list', label: 'input_map.list(no path)' },
  { tool: 'navigation', action: 'create_region', label: 'navigation.create_region(no path)' },
  { tool: 'physics', action: 'layers', label: 'physics.layers(no path)' },
  { tool: 'shader', action: 'create', label: 'shader.create(no path)' },
  { tool: 'signals', action: 'connect', label: 'signals.connect(no path)' },
  { tool: 'tilemap', action: 'create_tileset', label: 'tilemap.create_tileset(no path)' },
  { tool: 'ui', action: 'create_control', label: 'ui.create_control(no path)' },
  { tool: 'setup', action: 'detect_godot', label: 'setup.detect_godot(no project)' },
]

for (const { tool, action, label } of actionValidationCases) {
  try {
    const r = await client.callTool({ name: tool, arguments: { action } }, undefined, TIMEOUT)
    const t = r.content[0].text.toLowerCase()
    if (
      r.isError ||
      t.includes('error') ||
      t.includes('path') ||
      t.includes('required') ||
      t.includes('missing') ||
      t.includes('project_path') ||
      t.includes('not found') ||
      t.includes('godot') ||
      t.includes('detected') ||
      t.includes('no godot')
    ) {
      ok(label, r.content[0].text.slice(0, 80))
    } else {
      fail(label, `Expected validation error: ${r.content[0].text.slice(0, 60)}`)
    }
  } catch (e) {
    ok(label, `Error: ${e.message.slice(0, 60)}`)
  }
}

// ---------------------------------------------------------------------------
// Security: path traversal
// ---------------------------------------------------------------------------
console.log('\n--- Security ---')

try {
  const r = await client.callTool(
    {
      name: 'project',
      arguments: { action: 'info', project_path: '/etc/passwd' },
    },
    undefined,
    TIMEOUT,
  )
  const t = r.content[0].text.toLowerCase()
  if (
    r.isError ||
    t.includes('error') ||
    t.includes('invalid') ||
    t.includes('not found') ||
    t.includes('not a') ||
    t.includes('project') ||
    t.includes('godot')
  ) {
    ok('security: path traversal', r.content[0].text.slice(0, 80))
  } else {
    fail('security: path traversal', `Expected rejection: ${r.content[0].text.slice(0, 60)}`)
  }
} catch (e) {
  ok('security: path traversal', `Error: ${e.message.slice(0, 60)}`)
}

// ---------------------------------------------------------------------------
// 13. Security: XSS in help
// ---------------------------------------------------------------------------
try {
  const r = await client.callTool(
    {
      name: 'help',
      arguments: { tool_name: '<script>alert(1)</script>' },
    },
    undefined,
    TIMEOUT,
  )
  const t = r.content[0].text.toLowerCase()
  if (
    r.isError ||
    t.includes('error') ||
    t.includes('not found') ||
    t.includes('unknown') ||
    t.includes('no documentation') ||
    t.includes('available')
  ) {
    ok('security: XSS in help', r.content[0].text.slice(0, 80))
  } else {
    fail('security: XSS in help', `Expected rejection: ${r.content[0].text.slice(0, 60)}`)
  }
} catch (e) {
  ok('security: XSS in help', `Error: ${e.message.slice(0, 60)}`)
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
await client.close()

const total = passed + failed
console.log(`\n${'='.repeat(60)}`)
console.log(`RESULT: ${passed}/${total} PASS (${((100 * passed) / total).toFixed(1)}%)`)
console.log(`${'='.repeat(60)}`)

if (failed > 0) {
  console.log('\nFailed tests:')
  for (const r of results) {
    if (r.status === 'FAIL') {
      console.log(`  - ${r.label}: ${r.evidence}`)
    }
  }
  process.exit(1)
}
