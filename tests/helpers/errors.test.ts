/**
 * Tests for error handling utilities
 */

import { describe, expect, it } from 'vitest'
import {
  findClosestMatch,
  formatError,
  formatJSON,
  formatSuccess,
  GodotMCPError,
  requireArg,
  throwUnknownAction,
  withErrorHandling,
} from '../../src/tools/helpers/errors.js'

describe('errors', () => {
  // ==========================================
  // GodotMCPError
  // ==========================================
  describe('GodotMCPError', () => {
    it('should create error with code and message', () => {
      const err = new GodotMCPError('test message', 'GODOT_NOT_FOUND')
      expect(err.message).toBe('test message')
      expect(err.code).toBe('GODOT_NOT_FOUND')
      expect(err.name).toBe('GodotMCPError')
      expect(err.suggestion).toBeUndefined()
      expect(err.details).toBeUndefined()
    })

    it('should create error with suggestion', () => {
      const err = new GodotMCPError('test', 'SCENE_ERROR', 'Try this')
      expect(err.suggestion).toBe('Try this')
    })

    it('should create error with details', () => {
      const details = { path: '/some/path', code: 404 }
      const err = new GodotMCPError('test', 'PARSE_ERROR', undefined, details)
      expect(err.details).toEqual(details)
    })

    it('should be instanceof Error', () => {
      const err = new GodotMCPError('test', 'NODE_ERROR')
      expect(err).toBeInstanceOf(Error)
      expect(err).toBeInstanceOf(GodotMCPError)
    })
  })

  // ==========================================
  // formatError
  // ==========================================
  describe('formatError', () => {
    it('should format GodotMCPError with code and message', () => {
      const err = new GodotMCPError('Something failed', 'EXECUTION_ERROR')
      const result = formatError(err)
      expect(result.isError).toBe(true)
      expect(result.content).toHaveLength(1)
      expect(result.content[0].type).toBe('text')
      expect(result.content[0].text).toContain('EXECUTION_ERROR')
      expect(result.content[0].text).toContain('Something failed')
    })

    it('should include suggestion in formatted output', () => {
      const err = new GodotMCPError('msg', 'SCRIPT_ERROR', 'Install Godot')
      const result = formatError(err)
      expect(result.content[0].text).toContain('Suggestion: Install Godot')
    })

    it('should include details in formatted output', () => {
      const err = new GodotMCPError('msg', 'PARSE_ERROR', undefined, { key: 'value' })
      const result = formatError(err)
      expect(result.content[0].text).toContain('"key": "value"')
    })

    it('should format generic Error', () => {
      const result = formatError(new Error('generic error'))
      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('generic error')
    })

    it('should format unknown error type', () => {
      const result = formatError('string error')
      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('string error')
    })

    it('should format null/undefined error', () => {
      const result = formatError(null)
      expect(result.isError).toBe(true)
    })
  })

  // ==========================================
  // formatSuccess
  // ==========================================
  describe('formatSuccess', () => {
    it('should create success response', () => {
      const result = formatSuccess('Operation complete')
      expect(result.content).toHaveLength(1)
      expect(result.content[0].type).toBe('text')
      expect(result.content[0].text).toBe('Operation complete')
      expect((result as Record<string, unknown>).isError).toBeUndefined()
    })
  })

  // ==========================================
  // formatJSON
  // ==========================================
  describe('formatJSON', () => {
    it('should serialize object to JSON', () => {
      const result = formatJSON({ name: 'test', count: 5 })
      expect(result.content).toHaveLength(1)
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.name).toBe('test')
      expect(parsed.count).toBe(5)
    })

    it('should format with indentation', () => {
      const result = formatJSON({ a: 1 })
      expect(result.content[0].text).toContain('  ')
    })
  })

  // ==========================================
  // withErrorHandling
  // ==========================================
  describe('withErrorHandling', () => {
    it('should pass through successful result', async () => {
      const handler = async () => formatSuccess('ok')
      const wrapped = withErrorHandling(handler)
      const result = await wrapped()
      expect((result as { content: Array<{ text: string }> }).content[0].text).toBe('ok')
    })

    it('should catch thrown error and format it', async () => {
      const handler = async () => {
        throw new GodotMCPError('fail', 'EXECUTION_ERROR')
      }
      const wrapped = withErrorHandling(handler)
      const result = (await wrapped()) as { isError: boolean; content: Array<{ text: string }> }
      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('EXECUTION_ERROR')
    })
  })

  // ==========================================
  // findClosestMatch
  // ==========================================
  describe('findClosestMatch', () => {
    it('should return null for empty input', () => {
      expect(findClosestMatch('', ['option'])).toBeNull()
    })

    it('should return null for empty options', () => {
      expect(findClosestMatch('input', [])).toBeNull()
    })

    it('should return exact match (case-insensitive)', () => {
      expect(findClosestMatch('CREATE', ['create', 'delete'])).toBe('create')
    })

    it('should return prefix match', () => {
      expect(findClosestMatch('cre', ['create', 'delete'])).toBe('create')
    })

    it('should return containment match', () => {
      expect(findClosestMatch('create', ['cre', 'delete'])).toBe('cre')
    })

    it('should return fuzzy match using bigram similarity', () => {
      expect(findClosestMatch('crate', ['create', 'delete', 'update'])).toBe('create')
    })

    it('should return null if no match is good enough', () => {
      expect(findClosestMatch('xyz', ['create', 'delete'])).toBeNull()
    })

    it('should truncate input to 100 characters to prevent DoS', () => {
      const longInput = 'a'.repeat(200)
      const validOptions = ['a'.repeat(100), 'b'.repeat(100)]
      expect(findClosestMatch(longInput, validOptions)).toBe('a'.repeat(100))
    })

    it('should return the best fuzzy match when multiple options match', () => {
      expect(findClosestMatch('typescript', ['javascript', 'coffeescript'])).toBe('coffeescript')
    })

    it('should handle single character inputs (no bigrams)', () => {
      expect(findClosestMatch('a', ['abc', 'def'])).toBe('abc')
      expect(findClosestMatch('x', ['abc', 'def'])).toBeNull()
    })

    it('should handle single character options (no bigrams)', () => {
      expect(findClosestMatch('abc', ['a', 'z'])).toBe('a')
      expect(findClosestMatch('uvw', ['a', 'z'])).toBeNull()
    })

    it('should return the first match in case of a score tie', () => {
      expect(findClosestMatch('abcd', ['abce', 'abcf'])).toBe('abce')
    })

    it('should respect the 0.4 similarity threshold', () => {
      // 0.4 exactly: (2 * 2) / (5 + 5) = 0.4. Should NOT match (> 0.4 required).
      expect(findClosestMatch('123456', ['123xyz'])).toBeNull()

      // 0.5: (2 * 2) / (4 + 4) = 0.5. Should match.
      expect(findClosestMatch('12345', ['123xy'])).toBe('123xy')
    })
  })

  // ==========================================
  // throwUnknownAction
  // ==========================================
  describe('throwUnknownAction', () => {
    it('should throw GodotMCPError with INVALID_ACTION code', () => {
      expect(() => throwUnknownAction('unknown', ['create', 'delete'])).toThrow(GodotMCPError)
      try {
        throwUnknownAction('unknown', ['create', 'delete'])
      } catch (err) {
        const error = err as GodotMCPError
        expect(error.code).toBe('INVALID_ACTION')
        expect(error.message).toContain('Unknown action: unknown')
      }
    })

    it('should include suggestion if close match found', () => {
      try {
        throwUnknownAction('creete', ['create', 'delete'])
      } catch (err) {
        const error = err as GodotMCPError
        expect(error.message).toContain("Did you mean 'create'?")
      }
    })

    it('should not include suggestion if no close match found', () => {
      try {
        throwUnknownAction('xyz', ['create', 'delete'])
      } catch (err) {
        const error = err as GodotMCPError
        expect(error.message).not.toContain('Did you mean')
      }
    })

    it('should list valid actions in suggestion field', () => {
      try {
        throwUnknownAction('unknown', ['a', 'b'])
      } catch (err) {
        const error = err as GodotMCPError
        expect(error.suggestion).toContain('Valid actions: a, b')
      }
    })

    it('should truncate overly long action names in the error message', () => {
      const longAction = 'a'.repeat(200)
      try {
        throwUnknownAction(longAction, ['create', 'delete'])
      } catch (err) {
        const error = err as GodotMCPError
        expect(error.message).toContain(`Unknown action: ${'a'.repeat(100)}...`)
        expect(error.message.length).toBeLessThan(250)
      }
    })
  })

  // ==========================================
  // requireArg
  // ==========================================
  describe('requireArg', () => {
    it('should return value if present', () => {
      const args = { name: 'test', count: 1 }
      expect(requireArg<string>(args, 'name', 'Provide name')).toBe('test')
      expect(requireArg<number>(args, 'count', 'Provide count')).toBe(1)
    })

    it('should throw if argument is missing', () => {
      const args = { other: 'value' }
      expect(() => requireArg(args, 'missing', 'Suggestion')).toThrow(GodotMCPError)
      try {
        requireArg(args, 'missing', 'Suggestion')
      } catch (err) {
        const error = err as GodotMCPError
        expect(error.code).toBe('INVALID_ARGS')
        expect(error.message).toBe('No missing specified')
        expect(error.suggestion).toBe('Suggestion')
      }
    })

    it('should throw if argument is null', () => {
      const args = { val: null }
      expect(() => requireArg(args, 'val', 'Suggestion')).toThrow('No val specified')
    })

    it('should throw if argument is empty string', () => {
      const args = { val: '' }
      expect(() => requireArg(args, 'val', 'Suggestion')).toThrow('No val specified')
    })

    it('should allow falsy values that are not null/undefined/empty string', () => {
      const args = { count: 0, flag: false }
      expect(requireArg(args, 'count', 's')).toBe(0)
      expect(requireArg(args, 'flag', 's')).toBe(false)
    })
  })
})
