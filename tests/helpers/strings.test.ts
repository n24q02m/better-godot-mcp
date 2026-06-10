import { describe, expect, it } from 'vitest'
import { parseCommaSeparatedList, countMatches } from '../../src/tools/helpers/strings.js'

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
    it('should count occurrences of a simple string', () => {
      expect(countMatches('apple apple orange', 'apple')).toBe(2)
      expect(countMatches('apple apple orange', 'orange')).toBe(1)
      expect(countMatches('apple apple orange', 'banana')).toBe(0)
    })

    it('should count occurrences of a global RegExp', () => {
      expect(countMatches('apple apple orange', /apple/g)).toBe(2)
      expect(countMatches('apple apple orange', /orange/g)).toBe(1)
      expect(countMatches('apple apple orange', /banana/g)).toBe(0)
    })

    it('should count occurrences of a non-global RegExp', () => {
      expect(countMatches('apple apple orange', /apple/)).toBe(2)
      expect(countMatches('apple apple orange', /orange/)).toBe(1)
    })

    it('should handle empty strings', () => {
      expect(countMatches('', 'apple')).toBe(0)
      expect(countMatches('apple', '')).toBe(0)
    })

    it('should handle complex regex patterns', () => {
      const content = 'bus/0/name = "Master"\nbus/1/name = "Music"\nbus/2/name = "SFX"'
      expect(countMatches(content, /bus\/\d+\/name/g)).toBe(3)
    })

    it('should handle overlapping matches if implemented as such (current is non-overlapping)', () => {
      // "aaaa" with "aa" should be 2 matches (index 0 and 2)
      expect(countMatches('aaaa', 'aa')).toBe(2)
    })
  })
})
