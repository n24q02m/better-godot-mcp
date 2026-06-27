import { describe, expect, it } from 'vitest'
import { handleAnimation } from '../../src/tools/composite/animation.js'
import { handleNodes } from '../../src/tools/composite/nodes.js'
import { handleResources } from '../../src/tools/composite/resources.js'
import { handleSignals } from '../../src/tools/composite/signals.js'
import { GodotMCPError } from '../../src/tools/helpers/errors.js'

describe('Security: Prototype Pollution Prevention', () => {
  const config = { activePids: [], projectPath: '/mock/path' }
  const args = { project_path: '/mock/path' }

  // Object.prototype methods to test
  const maliciousActions = ['toString', 'valueOf', 'constructor', 'hasOwnProperty', 'isPrototypeOf']

  it('handleNodes rejects Object.prototype properties', async () => {
    for (const action of maliciousActions) {
      await expect(handleNodes(action, args, config as import('../../src/godot/types.js').GodotConfig)).rejects.toThrow(
        GodotMCPError,
      )

      await expect(handleNodes(action, args, config as import('../../src/godot/types.js').GodotConfig)).rejects.toThrow(
        /Unknown action:/,
      )
    }
  })

  it('handleSignals rejects Object.prototype properties', async () => {
    for (const action of maliciousActions) {
      await expect(
        handleSignals(action, args, config as import('../../src/godot/types.js').GodotConfig),
      ).rejects.toThrow(GodotMCPError)

      await expect(
        handleSignals(action, args, config as import('../../src/godot/types.js').GodotConfig),
      ).rejects.toThrow(/Unknown action:/)
    }
  })

  it('handleResources rejects Object.prototype properties', async () => {
    for (const action of maliciousActions) {
      await expect(
        handleResources(action, args, config as import('../../src/godot/types.js').GodotConfig),
      ).rejects.toThrow(GodotMCPError)

      await expect(
        handleResources(action, args, config as import('../../src/godot/types.js').GodotConfig),
      ).rejects.toThrow(/Unknown action:/)
    }
  })

  it('handleAnimation rejects Object.prototype properties', async () => {
    for (const action of maliciousActions) {
      await expect(
        handleAnimation(action, args, config as import('../../src/godot/types.js').GodotConfig),
      ).rejects.toThrow(GodotMCPError)

      await expect(
        handleAnimation(action, args, config as import('../../src/godot/types.js').GodotConfig),
      ).rejects.toThrow(/Unknown action:/)
    }
  })
})
