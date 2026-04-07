import { describe, expect, it } from 'vitest'
import { escapeRegExp, parseCommaSeparatedList } from '../../src/tools/helpers/strings.js'

describe('strings helpers', () => {
  describe('parseCommaSeparatedList', () => {
    it('should parse a simple comma-separated list', () => {
      expect(parseCommaSeparatedList('a,b,c')).toEqual(['a', 'b', 'c'])
    })

    it('should trim whitespace', () => {
      expect(parseCommaSeparatedList(' a , b , c ')).toEqual(['a', 'b', 'c'])
    })

    it('should trim quotes', () => {
      expect(parseCommaSeparatedList('"a","b","c"')).toEqual(['a', 'b', 'c'])
    })

    it('should trim whitespace and quotes combined', () => {
      expect(parseCommaSeparatedList(' "a" , "b" , "c" ')).toEqual(['a', 'b', 'c'])
    })

    it('should skip empty items', () => {
      expect(parseCommaSeparatedList(' , , ')).toEqual([])
    })

    it('should handle single item', () => {
      expect(parseCommaSeparatedList('"GroupA"')).toEqual(['GroupA'])
    })

    it('should handle empty string', () => {
      expect(parseCommaSeparatedList('')).toEqual([])
    })

    it('should handle items with inner spaces', () => {
      expect(parseCommaSeparatedList('word1 word2, word3 word4')).toEqual(['word1 word2', 'word3 word4'])
    })

    it('should return an empty array for undefined or null-like values (via type safety check)', () => {
      // @ts-expect-error
      expect(parseCommaSeparatedList(null)).toEqual([])
      // @ts-expect-error
      expect(parseCommaSeparatedList(undefined)).toEqual([])
    })
  })

  describe('escapeRegExp', () => {
    it('should handle empty strings', () => {
      expect(escapeRegExp('')).toBe('')
    })

    it('should return plain strings as-is', () => {
      expect(escapeRegExp('hello123')).toBe('hello123')
    })

    it('should escape all regex special characters', () => {
      const specialChars = '.*+?^' + '${' + '}()|[]\\'
      const expected = '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\'
      expect(escapeRegExp(specialChars)).toBe(expected)
    })

    it('should escape special characters mixed with plain text', () => {
      expect(escapeRegExp('node.name[1]')).toBe('node\\.name\\[1\\]')
    })
  })
})
