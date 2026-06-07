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

  describe('countMatches', () => {
    it('should count occurrences of a regex', () => {
      expect(countMatches('apple banana apple cherry apple', /apple/g)).toBe(3)
    })

    it('should return 0 when no matches are found', () => {
      expect(countMatches('apple banana cherry', /durian/g)).toBe(0)
    })

    it('should handle complex regexes', () => {
      expect(countMatches('abc1 def2 ghi3', /\d/g)).toBe(3)
    })
  })

  describe('countString', () => {
    it('should count occurrences of a substring', () => {
      expect(countString('apple banana apple cherry apple', 'apple')).toBe(3)
    })

    it('should return 0 when no matches are found', () => {
      expect(countString('apple banana cherry', 'durian')).toBe(0)
    })

    it('should return 0 for an empty search string', () => {
      expect(countString('apple', '')).toBe(0)
    })

    it('should handle overlapping occurrences (non-overlapping count)', () => {
      // Standard countString usually counts non-overlapping occurrences
      expect(countString('aaaaa', 'aa')).toBe(2)
    })
  })
})
