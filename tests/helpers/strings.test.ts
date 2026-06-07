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
    it('should count non-overlapping occurrences', () => {
      expect(countString('hello hello hello', 'hello')).toBe(3)
      expect(countString('aaaaa', 'aa')).toBe(2)
    })

    it('should return 0 if search string is not found', () => {
      expect(countString('hello', 'world')).toBe(0)
    })

    it('should return 0 and not infinite loop if search string is empty', () => {
      expect(countString('hello', '')).toBe(0)
    })

    it('should handle empty input string', () => {
      expect(countString('', 'hello')).toBe(0)
    })
  })

  describe('countMatches', () => {
    it('should count regex matches', () => {
      expect(countMatches('bus/0/name bus/1/name', /bus\/\d+\/name/g)).toBe(2)
      expect(countMatches('test 1 test 2 test 3', /test \d/g)).toBe(3)
    })

    it('should return 0 if no match', () => {
      expect(countMatches('hello', /world/g)).toBe(0)
    })

    it('should throw if global flag is missing to prevent infinite loops', () => {
      expect(() => countMatches('hello', /l/)).toThrow('countMatches requires a global RegExp')
    })

    it('should handle empty string', () => {
      expect(countMatches('', /test/g)).toBe(0)
    })
  })
})
