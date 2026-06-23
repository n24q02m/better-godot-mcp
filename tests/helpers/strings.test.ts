import { describe, expect, it } from 'vitest'
import { countSubstring, fastTrimRange, parseCommaSeparatedList } from '../../src/tools/helpers/strings.js'

describe('strings helper', () => {
  describe('fastTrimRange', () => {
    it('should trim whitespace from both ends', () => {
      const s = '  hello  '
      expect(fastTrimRange(s, 0, s.length)).toEqual({ start: 2, end: 7 })
    })

    it('should handle already trimmed strings', () => {
      const s = 'hello'
      expect(fastTrimRange(s, 0, s.length)).toEqual({ start: 0, end: 5 })
    })

    it('should handle empty strings', () => {
      const s = ''
      expect(fastTrimRange(s, 0, 0)).toEqual({ start: 0, end: 0 })
    })

    it('should handle strings with only whitespace', () => {
      const s = '   '
      expect(fastTrimRange(s, 0, s.length)).toEqual({ start: 3, end: 3 })
    })

    it('should respect the provided range', () => {
      const s = 'abc  def  ghi'
      // "  def  " is from index 3 to 10
      expect(fastTrimRange(s, 3, 10)).toEqual({ start: 5, end: 8 })
    })

    it('should handle null/unusual whitespace (charCode <= 32)', () => {
      const s = '\t\n \rhello\0'
      expect(fastTrimRange(s, 0, s.length)).toEqual({ start: 4, end: 9 })
    })
  })

  describe('parseCommaSeparatedList', () => {
    it('should parse simple list', () => {
      expect(parseCommaSeparatedList('a,b,c')).toEqual(['a', 'b', 'c'])
    })

    it('should trim whitespace', () => {
      expect(parseCommaSeparatedList(' a , b , c ')).toEqual(['a', 'b', 'c'])
    })

    it('should handle quotes', () => {
      expect(parseCommaSeparatedList('"a","b",c')).toEqual(['a', 'b', 'c'])
    })

    it('should handle empty input', () => {
      expect(parseCommaSeparatedList('')).toEqual([])
    })

    it('should skip empty entries', () => {
      expect(parseCommaSeparatedList('a,,b')).toEqual(['a', 'b'])
    })
  })

  describe('countSubstring', () => {
    it('should count occurrences correctly', () => {
      expect(countSubstring('banana', 'a')).toBe(3)
      expect(countSubstring('banana', 'na')).toBe(2)
      expect(countSubstring('aaaaa', 'aa')).toBe(2)
    })

    it('should return 0 for non-existent substring', () => {
      expect(countSubstring('banana', 'z')).toBe(0)
    })

    it('should handle empty search string', () => {
      expect(countSubstring('banana', '')).toBe(0)
    })
  })
})
