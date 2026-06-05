/**
 * String parsing utilities
 */

/**
 * Fast-path parser for comma-separated lists, avoiding split/map/filter allocations.
 * Uses a single-pass loop to find delimiters, trimming whitespace and quotes in-place.
 */
export function parseCommaSeparatedList(str: string): string[] {
  if (!str) return []
  const result: string[] = []
  let start = 0
  const len = str.length

  while (start < len) {
    const commaIdx = str.indexOf(',', start)
    const end = commaIdx === -1 ? len : commaIdx

    // Trim leading whitespace and quotes
    let i = start
    let j = end - 1

    while (i <= j && (str.charCodeAt(i) <= 32 || str[i] === '"')) i++
    while (j >= i && (str.charCodeAt(j) <= 32 || str[j] === '"')) j--

    if (i <= j) {
      result.push(str.slice(i, j + 1))
    }

    if (commaIdx === -1) break
    start = commaIdx + 1
  }

  return result
}

/**
 * Counts the number of occurrences of a substring within a string.
 * This is an optimized alternative to `(str.match(new RegExp(search, 'g')) || []).length`
 * as it avoids regular expression compilation, match array allocation, and garbage collection.
 */
export function countString(str: string, search: string): number {
  if (!search) return 0
  let count = 0
  let pos = 0
  while (true) {
    pos = str.indexOf(search, pos)
    if (pos === -1) break
    count++
    pos += search.length
  }
  return count
}

/**
 * Counts the number of matches of a regular expression within a string.
 * This is an optimized alternative to `(str.match(pattern) || []).length`
 * as it uses `matchAll` which returns an iterator instead of allocating a full array,
 * reducing garbage collection pressure.
 * The provided regular expression must have the 'g' flag.
 */
export function countMatches(str: string, pattern: RegExp): number {
  let count = 0
  for (const _ of str.matchAll(pattern)) {
    count++
  }
  return count
}
