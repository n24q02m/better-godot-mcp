import { describe, expect, it } from 'vitest'
import { countMatches, countSubstring, parseCommaSeparatedList } from '../../src/tools/helpers/strings.js'

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

  describe('countMatches', () => {
    it('should count substring occurrences correctly', () => {
      expect(countMatches('banana', 'a')).toBe(3)
      expect(countMatches('banana', 'na')).toBe(2)
      expect(countMatches('aaaaa', 'aa')).toBe(2)
    })

    it('should count RegExp occurrences correctly', () => {
      expect(countMatches('banana', /a/g)).toBe(3)
      expect(countMatches('banana', /na/g)).toBe(2)
      // matchAll for /aa/g in "aaaaa" with standard behavior:
      // "aaaaa" -> index 0: "aa", index 1: "aa", index 2: "aa", index 3: "aa"
      // Wait, matchAll with /aa/g:
      // index 0: aa, next search at index 2
      // index 2: aa, next search at index 4
      // Total 2.
      expect(countMatches('aaaaa', /aa/g)).toBe(2)
    })

    it('should handle non-global RegExp', () => {
      expect(countMatches('banana', /a/)).toBe(1)
      expect(countMatches('banana', /z/)).toBe(0)
    })

    it('should return 0 for non-existent matches', () => {
      expect(countMatches('banana', 'z')).toBe(0)
      expect(countMatches('banana', /z/g)).toBe(0)
    })

    it('should handle empty search', () => {
      expect(countMatches('banana', '')).toBe(0)
    })
  })

  describe('countSubstring', () => {
    it('should count occurrences correctly', () => {
      expect(countSubstring('banana', 'a')).toBe(3)
      expect(countSubstring('banana', 'na')).toBe(2)
      expect(countSubstring('aaaaa', 'aa')).toBe(2)
    })
  })
})
