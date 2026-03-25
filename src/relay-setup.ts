/**
 * Zero-env-config relay setup flow.
 *
 * When GODOT_PROJECT_PATH is not set, this module resolves config from the
 * encrypted config file or triggers the relay page setup to collect the
 * project path from the user via a browser-based form.
 *
 * Godot binary auto-detection is handled separately by detector.ts,
 * so the relay primarily collects the project path.
 */

import { writeConfig } from '@n24q02m/mcp-relay-core'
import { createSession, pollForResult } from '@n24q02m/mcp-relay-core/relay'
import { resolveConfig } from '@n24q02m/mcp-relay-core/storage'
import { RELAY_SCHEMA } from './relay-schema.js'

const SERVER_NAME = 'better-godot-mcp'
const DEFAULT_RELAY_URL = 'https://better-godot-mcp.n24q02m.com'
const REQUIRED_FIELDS = ['project_path']

export interface GodotRelayConfig {
  projectPath: string
  godotPath: string | null
}

/**
 * Parse relay config into GodotRelayConfig.
 *
 * The relay returns { project_path, godot_path? }.
 * This normalizes them for consumption by init-server.ts.
 */
export function parseRelayConfig(config: Record<string, string>): GodotRelayConfig {
  const { project_path, godot_path } = config
  if (!project_path) {
    throw new Error('Relay config missing required field: project_path')
  }
  return {
    projectPath: project_path,
    godotPath: godot_path || null,
  }
}

/**
 * Resolve config or trigger relay setup.
 *
 * Resolution order:
 * 1. Encrypted config file (~/.config/mcp/config.enc)
 * 2. Relay setup (browser-based form via relay server)
 *
 * Returns GodotRelayConfig, or null if setup fails/times out.
 *
 * Note: Environment variables (GODOT_PROJECT_PATH, GODOT_PATH) are checked
 * in init-server.ts before calling this function. This is only called when
 * GODOT_PROJECT_PATH is not set via env.
 */
export async function ensureConfig(): Promise<GodotRelayConfig | null> {
  // Check config file
  const result = await resolveConfig(SERVER_NAME, REQUIRED_FIELDS)
  if (result.config !== null) {
    console.error(`[${SERVER_NAME}] Project config loaded from ${result.source}`)
    return parseRelayConfig(result.config)
  }

  // No config found -- trigger relay setup
  console.error(`[${SERVER_NAME}] No project path configured. Starting relay setup...`)

  const relayUrl = DEFAULT_RELAY_URL
  let session: Awaited<ReturnType<typeof createSession>>
  try {
    session = await createSession(relayUrl, SERVER_NAME, RELAY_SCHEMA)
  } catch {
    console.error(`[${SERVER_NAME}] Cannot reach relay server at ${relayUrl}. Set GODOT_PROJECT_PATH manually.`)
    return null
  }

  // Log URL to stderr (visible to user in MCP client)
  console.error(`\n[${SERVER_NAME}] Setup required. Open this URL to configure:\n${session.relayUrl}\n`)

  // Poll for result
  let config: Record<string, string>
  try {
    config = await pollForResult(relayUrl, session)
  } catch {
    console.error(`[${SERVER_NAME}] Relay setup timed out or session expired`)
    return null
  }

  // Save to config file for future use
  await writeConfig(SERVER_NAME, config)
  console.error(`[${SERVER_NAME}] Project config saved successfully`)

  return parseRelayConfig(config)
}
