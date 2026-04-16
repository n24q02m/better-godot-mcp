import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleSignals } from '../../src/tools/composite/signals.js'

describe('signals security', () => {
  const projectPath = './test-project-security'
  const scenePath = 'test.tscn'
  const fullPath = join(projectPath, scenePath)
  const config: GodotConfig = { projectPath, godotPath: 'godot' }

  beforeEach(async () => {
    await mkdir(projectPath, { recursive: true })
    await writeFile(fullPath, '[gd_scene format=3]\n\n[node name="Node" type="Node"]\n', 'utf-8')
  })

  afterEach(async () => {
    await rm(projectPath, { recursive: true, force: true })
  })

  it('should block newline injection in signal name', async () => {
    await expect(
      handleSignals(
        'connect',
        {
          scene_path: scenePath,
          signal: 'my_signal\n[evil]',
          from: 'Node',
          to: 'Node',
          method: 'target',
        },
        config,
      ),
    ).rejects.toThrow('Invalid characters in parameters')
  })

  it('should block quote injection in signal name', async () => {
    await expect(
      handleSignals(
        'connect',
        {
          scene_path: scenePath,
          signal: 'my_signal" from="Other"',
          from: 'Node',
          to: 'Node',
          method: 'target',
        },
        config,
      ),
    ).rejects.toThrow('Invalid characters in parameters')
  })

  it('should block bracket injection in signal name', async () => {
    await expect(
      handleSignals(
        'connect',
        {
          scene_path: scenePath,
          signal: 'my_signal] [evil]',
          from: 'Node',
          to: 'Node',
          method: 'target',
        },
        config,
      ),
    ).rejects.toThrow('Invalid characters in parameters')
  })

  it('should block non-number flags', async () => {
    await expect(
      handleSignals(
        'connect',
        {
          scene_path: scenePath,
          signal: 'my_signal',
          from: 'Node',
          to: 'Node',
          method: 'target',
          flags: '0] [evil]',
        },
        config,
      ),
    ).rejects.toThrow('flags must be a number')
  })
})
