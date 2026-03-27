/**
 * Relay-first setup flow for better-godot-mcp.
 *
 * Always shows the relay URL at startup so users can configure the Godot
 * project path via browser. If the user skips, tools will prompt for
 * project_path on each call.
 *
 * Resolution order:
 * 1. Environment variables (GODOT_PROJECT_PATH -- checked by caller)
 * 2. Encrypted config file (~/.config/mcp/config.enc)
 * 3. Relay setup (browser-based form, 30s timeout for optional-config server)
 * 4. No default project path (tools accept project_path param)
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

// Shorter timeout for optional-config servers (user can skip)
const RELAY_TIMEOUT_MS = 30_000

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
 * Resolve config or trigger relay setup (relay-first design).
 *
 * Always shows relay URL at startup. Uses 30s timeout since Godot MCP
 * works without a default project path (tools accept project_path param).
 *
 * Returns GodotRelayConfig, or null if setup fails/skipped.
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

  // No config found -- always trigger relay setup (relay-first)
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
  console.error(
    `\n[${SERVER_NAME}] Configure project path (optional, 30s timeout):\n${session.relayUrl}\nSkip to provide project_path per tool call.\n`,
  )

  // Poll for result with shorter timeout
  let config: Record<string, string>
  try {
    config = await pollForResult(relayUrl, session, 2000, RELAY_TIMEOUT_MS)
  } catch (err: any) {
    if (err?.message === 'RELAY_SKIPPED') {
      console.error(`[${SERVER_NAME}] Relay setup skipped by user.`)
      return null
    }
    if (err?.message?.includes('timed out')) {
      console.error(`[${SERVER_NAME}] Relay setup timed out. No default project path.`)
    } else {
      console.error(`[${SERVER_NAME}] Relay setup failed: ${err?.message}`)
    }
    return null
  }

  // Save to config file for future use
  await writeConfig(SERVER_NAME, config)
  console.error(`[${SERVER_NAME}] Project config saved successfully`)

  return parseRelayConfig(config)
}
