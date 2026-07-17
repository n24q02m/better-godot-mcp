import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setHomeDirForTesting } from '@n24q02m/mcp-core/storage'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runGodotCli } from '../src/godot-cli.js'
import { initServer } from '../src/init-server.js'

vi.mock('../src/godot-cli.js', () => ({
  runGodotCli: vi.fn(),
}))

vi.mock('../src/init-server.js', () => ({
  initServer: vi.fn(),
}))

describe('start-server (buildCli wiring)', () => {
  const originalArgv = process.argv
  const originalExit = process.exit
  let onceSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    setHomeDirForTesting(mkdtempSync(join(tmpdir(), 'better-godot-mcp-cli-test-')))

    process.argv = ['node', 'scripts/start-server.ts']
    process.exit = vi.fn((_code) => undefined as never) as unknown as typeof process.exit
    onceSpy = vi.spyOn(process, 'once').mockImplementation((_event, _listener) => process)
  })

  afterEach(() => {
    process.argv = originalArgv
    process.exit = originalExit
    setHomeDirForTesting(null)
    vi.restoreAllMocks()
  })

  it('routes "doctor" to the Godot-specific handler, not the core built-in', async () => {
    process.argv.push('doctor')
    vi.mocked(runGodotCli).mockResolvedValue(0)

    await import('./start-server.js')
    await vi.waitFor(() => expect(runGodotCli).toHaveBeenCalledWith('doctor'))

    expect(initServer).not.toHaveBeenCalled()
    expect(process.exit).toHaveBeenCalledWith(0)
  })

  it('routes "detect" to the Godot-specific handler', async () => {
    process.argv.push('detect')
    vi.mocked(runGodotCli).mockResolvedValue(0)

    await import('./start-server.js')
    await vi.waitFor(() => expect(runGodotCli).toHaveBeenCalledWith('detect'))

    expect(initServer).not.toHaveBeenCalled()
    expect(process.exit).toHaveBeenCalledWith(0)
  })

  it('propagates the Godot doctor exit code (1 when Godot is not found)', async () => {
    process.argv.push('doctor')
    vi.mocked(runGodotCli).mockResolvedValue(1)

    await import('./start-server.js')
    await vi.waitFor(() => expect(process.exit).toHaveBeenCalled())

    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('exposes the core doctor (node runtime / storage / relay / mode) under "core-doctor"', async () => {
    process.argv.push('core-doctor')
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await import('./start-server.js')
    // The built-in doctor's session-lock probe does real file I/O (isolated
    // to the mkdtemp'd home dir above), which is slower than the other
    // subcommand paths here -- past vi.waitFor's default 1000ms on this
    // machine.
    await vi.waitFor(() => expect(process.exit).toHaveBeenCalled(), { timeout: 5000 })

    // This is the core built-in's own output shape ([ok]/[warn]/[fail]
    // lines), distinct from Godot's `doctor` (editor detection).
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[ok] node'))
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[warn] config: not configured'))
    expect(runGodotCli).not.toHaveBeenCalled()
    expect(initServer).not.toHaveBeenCalled()
    logSpy.mockRestore()
  })

  it('prints version and exits 0 without starting the server', async () => {
    process.argv.push('--version')
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await import('./start-server.js')
    await vi.waitFor(() => expect(process.exit).toHaveBeenCalled())

    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/^better-godot-mcp \d+\.\d+\.\d+/))
    expect(process.exit).toHaveBeenCalledWith(0)
    expect(initServer).not.toHaveBeenCalled()
    logSpy.mockRestore()
  })

  it('lists doctor/detect/core-doctor as subcommands in -h', async () => {
    process.argv.push('-h')
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await import('./start-server.js')
    await vi.waitFor(() => expect(process.exit).toHaveBeenCalledWith(0))

    const subcommandsLine = logSpy.mock.calls.map((c) => String(c[0])).find((l) => l.startsWith('subcommands:'))
    expect(subcommandsLine).toContain('doctor')
    expect(subcommandsLine).toContain('detect')
    expect(subcommandsLine).toContain('core-doctor')
    logSpy.mockRestore()
  })

  it('starts the server and registers SIGINT/SIGTERM when no subcommand is given', async () => {
    vi.mocked(initServer).mockResolvedValue(undefined)

    await import('./start-server.js')
    await vi.waitFor(() => expect(initServer).toHaveBeenCalled())

    expect(runGodotCli).not.toHaveBeenCalled()
    expect(onceSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function))
    expect(onceSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function))
  })

  it('does not exit right after initServer resolves (stdio must stay alive until shutdown)', async () => {
    // Regression guard: Server.connect() (inside initServer) resolves once
    // the transport starts listening, not once the session ends. If
    // `serve()` returned right there, buildCli's own
    // `.then((code) => process.exit(code))` would kill the process
    // immediately after startup instead of keeping the server running.
    vi.mocked(initServer).mockResolvedValue(undefined)

    await import('./start-server.js')
    await vi.waitFor(() => expect(initServer).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(process.exit).not.toHaveBeenCalled()
  })

  it('exits 0 once SIGINT fires after the server starts', async () => {
    vi.mocked(initServer).mockResolvedValue(undefined)

    let sigintHandler: (() => void) | undefined
    onceSpy.mockImplementation((event: string, listener: (...args: unknown[]) => void) => {
      if (event === 'SIGINT') sigintHandler = listener as () => void
      return process
    })

    await import('./start-server.js')
    await vi.waitFor(() => expect(initServer).toHaveBeenCalled())
    await vi.waitFor(() => expect(sigintHandler).toBeDefined())

    sigintHandler?.()
    await vi.waitFor(() => expect(process.exit).toHaveBeenCalledWith(0))
  })

  it('exits with 1 if initServer throws', async () => {
    const error = new Error('Init failed')
    vi.mocked(initServer).mockRejectedValue(error)

    await import('./start-server.js')
    await vi.waitFor(() => expect(initServer).toHaveBeenCalled())
    await vi.waitFor(() => expect(process.exit).toHaveBeenCalledWith(1))
  })

  it('does not add a redundant SIGINT wait for --http (initServer already blocks until its own shutdown)', async () => {
    process.argv.push('--http')
    vi.mocked(initServer).mockResolvedValue(undefined)

    await import('./start-server.js')
    await vi.waitFor(() => expect(initServer).toHaveBeenCalled())
    await vi.waitFor(() => expect(process.exit).toHaveBeenCalledWith(0))

    expect(onceSpy).not.toHaveBeenCalled()
  })
})
