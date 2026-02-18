import { describe, expect, it } from 'vitest'

describe('Better Godot MCP', () => {
  describe('init-server', () => {
    it('should export initServer function', async () => {
      // Verify module exports exist
      const mod = await import('../src/init-server.js')
      expect(mod.initServer).toBeDefined()
      expect(typeof mod.initServer).toBe('function')
    })
  })

  describe('detector', () => {
    it('should parse Godot version string', async () => {
      const { parseGodotVersion } = await import('../src/godot/detector.js')

      const v1 = parseGodotVersion('Godot Engine v4.6.stable.official')
      expect(v1).not.toBeNull()
      expect(v1?.major).toBe(4)
      expect(v1?.minor).toBe(6)
      expect(v1?.patch).toBe(0)

      const v2 = parseGodotVersion('4.3.1.stable')
      expect(v2).not.toBeNull()
      expect(v2?.major).toBe(4)
      expect(v2?.minor).toBe(3)
      expect(v2?.patch).toBe(1)
    })

    it('should validate minimum version', async () => {
      const { isVersionSupported } = await import('../src/godot/detector.js')

      expect(isVersionSupported({ major: 4, minor: 6, patch: 0, label: 'stable', raw: '' })).toBe(true)
      expect(isVersionSupported({ major: 4, minor: 1, patch: 0, label: 'stable', raw: '' })).toBe(true)
      expect(isVersionSupported({ major: 4, minor: 0, patch: 0, label: 'stable', raw: '' })).toBe(false)
      expect(isVersionSupported({ major: 3, minor: 5, patch: 0, label: 'stable', raw: '' })).toBe(false)
      expect(isVersionSupported({ major: 5, minor: 0, patch: 0, label: 'dev', raw: '' })).toBe(true)
    })
  })

  describe('errors', () => {
    it('should format GodotMCPError correctly', async () => {
      const { GodotMCPError, formatError } = await import('../src/tools/helpers/errors.js')

      const error = new GodotMCPError('Test error', 'GODOT_NOT_FOUND', 'Install Godot')
      const result = formatError(error)

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('GODOT_NOT_FOUND')
      expect(result.content[0].text).toContain('Test error')
      expect(result.content[0].text).toContain('Install Godot')
    })

    it('should format generic errors', async () => {
      const { formatError } = await import('../src/tools/helpers/errors.js')

      const result = formatError(new Error('generic'))
      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('generic')
    })
  })
})
