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
      expect(countString('apple, banana, apple, cherry', 'apple')).toBe(2)
    })

    it('should return 0 if substring is not found', () => {
      expect(countString('apple, banana, cherry', 'date')).toBe(0)
    })

    it('should handle empty strings', () => {
      expect(countString('', 'apple')).toBe(0)
      expect(countString('apple', '')).toBe(0)
    })
  })

  describe('countMatches', () => {
    it('should count occurrences of a regex pattern', () => {
      expect(countMatches('bus/0/name, bus/1/name, bus/2/name', /bus\/\d+\/name/g)).toBe(3)
    })

    it('should return 0 if pattern is not found', () => {
      expect(countMatches('apple, banana, cherry', /date/g)).toBe(0)
    })

    it('should handle empty strings', () => {
      expect(countMatches('', /apple/g)).toBe(0)
    })
  })
})
