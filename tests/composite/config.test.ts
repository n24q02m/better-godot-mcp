import { describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleConfig } from '../../src/tools/composite/config.js'

describe('Config Tool', () => {
  it('should prevent setting godot_path with shell metacharacters', async () => {
    const config: GodotConfig = {
      godotPath: '',
      godotVersion: null,
      projectPath: '',
    }

    await expect(handleConfig('set', { key: 'godot_path', value: '; echo malicious' }, config)).rejects.toThrow(
      'Invalid characters in godot_path',
    )

    expect(config.godotPath).toBe('')
  })

  it('should allow setting valid godot_path', async () => {
    const config: GodotConfig = {
      godotPath: '',
      godotVersion: null,
      projectPath: '',
    }

    const result = await handleConfig('set', { key: 'godot_path', value: '/usr/bin/godot' }, config)
    expect(config.godotPath).toBe('/usr/bin/godot')
    expect(result.content[0].text).toContain('Config updated')
  })
})
