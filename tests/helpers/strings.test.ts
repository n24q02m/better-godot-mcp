import { describe, expect, it } from 'vitest'
import { parseCommaSeparatedList } from '../../src/tools/helpers/strings.js'

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

    it('should handle commas inside quotes', () => {
      expect(parseCommaSeparatedList('"a, b", c')).toEqual(['a, b', 'c'])
    })

    it('should handle multiple quoted items with commas', () => {
      expect(parseCommaSeparatedList('"a, b", "c, d", e')).toEqual(['a, b', 'c, d', 'e'])
    })

    it('should handle unquoted items with commas correctly by not over-trimming', () => {
      expect(parseCommaSeparatedList('a b, c d')).toEqual(['a b', 'c d'])
    })

    it('should handle empty quotes', () => {
      expect(parseCommaSeparatedList('"", " ", a')).toEqual(['a'])
    })

    it('should handle mixed quotes types (if only double quotes are supported)', () => {
      // Current implementation only handles double quotes as per requirements and previous behavior
      expect(parseCommaSeparatedList("'a, b', c")).toEqual(["'a", "b'", 'c'])
    })
  })
})
