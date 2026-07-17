/**
 * Better Godot MCP Server Starter
 *
 * Wired via mcp-core's buildCli: `config`/`relay`/`--version`/`-h` built-ins
 * (Task W5.1). godot keeps its own `doctor`/`detect` (Godot editor
 * detection, see godot-cli.ts) instead of the built-in `doctor` (node
 * runtime / credential backend / store dir / config / relay session /
 * mode) -- godot is TC-Local and stores no credentials, so the built-in
 * doctor's storage checks are not meaningful here, but it is still exposed
 * under `core-doctor` for parity with the other servers' CLI surface.
 */

import { buildCli } from '@n24q02m/mcp-core'
import pkg from '../package.json' with { type: 'json' }
import { runGodotCli } from '../src/godot-cli.js'
import { initServer } from '../src/init-server.js'
import { logger } from '../src/tools/helpers/logger.js'

const SERVER_NAME = 'better-godot-mcp'

/**
 * `serve` entry point for `buildCli` (bare/flag argv routes here).
 *
 * http mode's `initServer()` already blocks until its own SIGINT/SIGTERM
 * shutdown completes, but stdio mode's `server.connect(transport)` resolves
 * the instant the transport starts listening, not once the session ends.
 * If this function returned right there, buildCli's own
 * `.then((code) => process.exit(code))` would kill the process immediately
 * after startup. So stdio keeps this promise pending until SIGINT/SIGTERM,
 * mirroring the shutdown-wait pattern http already uses.
 */
async function serve(): Promise<number | undefined> {
  try {
    await initServer()
  } catch (error) {
    logger.error('Failed to start server:', error)
    return 1
  }

  const isHttp =
    process.argv.includes('--http') || process.env.MCP_TRANSPORT === 'http' || process.env.TRANSPORT_MODE === 'http'
  if (isHttp) return 0

  await new Promise<void>((resolve) => {
    const shutdown = () => {
      logger.info('Shutting down Better Godot MCP Server')
      resolve()
    }
    process.once('SIGINT', shutdown)
    process.once('SIGTERM', shutdown)
  })
  return undefined
}

// Separate buildCli instance solely to reach the built-in `doctor` handler
// under a different subcommand name: godot's own `doctor` (extra, below)
// overrides the built-in, so this is the only way to still reach it. `serve`
// is never invoked through this instance (only `run(['doctor', ...])` is
// called on it), so a no-op stands in for it.
const coreDoctor = buildCli(SERVER_NAME, { serve: () => 0 })

const run = buildCli(SERVER_NAME, {
  serve,
  version: pkg.version,
  extra: {
    doctor: () => runGodotCli('doctor'),
    detect: () => runGodotCli('detect'),
    'core-doctor': (argv) => coreDoctor(['doctor', ...argv]),
  },
})

run(process.argv.slice(2)).then((code) => process.exit(code))
