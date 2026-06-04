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
  })
})

import { countMatches, countString } from '../../src/tools/helpers/strings.js'

describe('countMatches', () => {
  it('should count occurrences of a regex', () => {
    expect(countMatches('abcabcabc', /a/g)).toBe(3)
    expect(countMatches('abcabcabc', /abc/g)).toBe(3)
    expect(countMatches('abcabcabc', /d/g)).toBe(0)
  })

  it('should handle complex regex', () => {
    expect(countMatches('bus/0/name = "Master"\nbus/1/name = "SFX"', /bus\/\d+\/name/g)).toBe(2)
  })
})

describe('countString', () => {
  it('should count occurrences of a substring', () => {
    expect(countString('abcabcabc', 'a')).toBe(3)
    expect(countString('abcabcabc', 'abc')).toBe(3)
    expect(countString('abcabcabc', 'd')).toBe(0)
  })

  it('should handle overlapping strings if specified (standard behavior is non-overlapping start positions)', () => {
    // indexOf(substr, pos + substr.length) means non-overlapping
    expect(countString('aaaaa', 'aa')).toBe(2)
  })

  it('should return 0 for empty substring', () => {
    expect(countString('abc', '')).toBe(0)
  })
})
