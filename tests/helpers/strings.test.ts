import { describe, expect, it } from 'vitest'
import { countSubstring, parseCommaSeparatedList, trimEnd, trimStart } from '../../src/tools/helpers/strings.js'

describe('strings helper', () => {
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

  describe('trimStart', () => {
    it('should trim leading whitespace', () => {
      const s = '  hello'
      expect(trimStart(s, 0, s.length)).toBe(2)
    })

    it('should handle no leading whitespace', () => {
      const s = 'hello'
      expect(trimStart(s, 0, s.length)).toBe(0)
    })

    it('should respect end boundary', () => {
      const s = '    '
      expect(trimStart(s, 0, 2)).toBe(2)
    })
  })

  describe('trimEnd', () => {
    it('should trim trailing whitespace', () => {
      const s = 'hello  '
      expect(trimEnd(s, 0, s.length)).toBe(5)
    })

    it('should handle no trailing whitespace', () => {
      const s = 'hello'
      expect(trimEnd(s, 0, s.length)).toBe(5)
    })

    it('should respect start boundary', () => {
      const s = '    '
      expect(trimEnd(s, 2, s.length)).toBe(2)
    })
  })
})
