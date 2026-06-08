import { describe, expect, it } from 'vitest'
import { countMatches, countString, parseCommaSeparatedList } from '../../src/tools/helpers/strings.js'

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
  })

  describe('countString', () => {
    it('should count occurrences of a substring', () => {
      expect(countString('hello hello hello', 'hello')).toBe(3)
      expect(countString('abcabcabc', 'bc')).toBe(3)
    })

    it('should handle non-overlapping occurrences correctly', () => {
      expect(countString('aaaa', 'aa')).toBe(2)
    })

    it('should return 0 if not found', () => {
      expect(countString('hello', 'world')).toBe(0)
    })

    it('should handle empty search string', () => {
      expect(countString('hello', '')).toBe(0)
    })

    it('should handle empty input string', () => {
      expect(countString('', 'abc')).toBe(0)
    })
  })

  describe('countMatches', () => {
    it('should count regex matches', () => {
      expect(countMatches(/a/g, 'aaaa')).toBe(4)
      expect(countMatches(/a+/g, 'aaaa')).toBe(1)
      expect(countMatches(/bus\/\d+\/name/g, 'bus/0/name bus/1/name')).toBe(2)
    })

    it('should handle non-global regex', () => {
      expect(countMatches(/a/, 'aaaa')).toBe(1)
      expect(countMatches(/b/, 'aaaa')).toBe(0)
    })

    it('should handle zero-width matches without infinite loop', () => {
      expect(countMatches(/a*/g, 'b')).toBe(2) // "" before "b", "" after "b"
    })

    it('should preserve regex state', () => {
      const re = /a/g
      re.lastIndex = 2
      expect(countMatches(re, 'aaaa')).toBe(4)
      expect(re.lastIndex).toBe(2)
    })
  })
})
