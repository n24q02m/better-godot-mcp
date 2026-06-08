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
      expect(countString('abcabcabc', 'abc')).toBe(3)
      expect(countString('aaaaa', 'aa')).toBe(2) // non-overlapping by default with this implementation
    })

    it('should return 0 if not found', () => {
      expect(countString('hello', 'world')).toBe(0)
    })

    it('should return 0 for empty search string', () => {
      expect(countString('hello', '')).toBe(0)
    })
  })

  describe('countMatches', () => {
    it('should count regex matches', () => {
      expect(countMatches('hello hello hello', /hello/g)).toBe(3)
      expect(countMatches('abc1abc2abc3', /abc\d/g)).toBe(3)
    })

    it('should return 0 if no match', () => {
      expect(countMatches('hello', /world/g)).toBe(0)
    })

    it('should handle non-global regex', () => {
      expect(countMatches('hello hello', /hello/)).toBe(1)
      expect(countMatches('world', /hello/)).toBe(0)
    })
  })
})
