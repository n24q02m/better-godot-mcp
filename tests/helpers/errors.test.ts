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
      // It should match the 100-character 'a' option because it truncates the input to 100 'a's
      expect(findClosestMatch(longInput, validOptions)).toBe('a'.repeat(100))
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
        expect(error.message.length).toBeLessThan(250) // Ensure message isn't insanely long
      }
    })
  })
})
