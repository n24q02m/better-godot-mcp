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
    it('should count matches of a global regex', () => {
      expect(countMatches('a1 b2 c3', /\d/g)).toBe(3)
    })

    it('should return 0 if no matches', () => {
      expect(countMatches('abc', /\d/g)).toBe(0)
    })

    it('should throw if regex is not global', () => {
      expect(() => countMatches('a1', /\d/)).toThrow('countMatches requires a global RegExp')
    })
  })

  describe('countString', () => {
    it('should count occurrences of a substring', () => {
      expect(countString('hello hello hello', 'hello')).toBe(3)
    })

    it('should return 0 if no matches', () => {
      expect(countString('hello', 'world')).toBe(0)
    })

    it('should return 0 for empty search string', () => {
      expect(countString('hello', '')).toBe(0)
    })

    it('should handle overlapping matches if they are not overlapping literally', () => {
      // our implementation uses indexOf(search, pos + search.length) so 'aaa' searching 'aa' is 1
      expect(countString('aaa', 'aa')).toBe(1)
    })
  })
})
