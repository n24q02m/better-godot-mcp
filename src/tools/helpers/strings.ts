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
 * Counts non-overlapping occurrences of a substring using an optimized indexOf loop.
 * Avoids Array allocations associated with .match() or .split().
 * ⚡ Bolt: Replaces (str.match(new RegExp(search, 'g')) || []).length
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
 * Counts occurrences of a regular expression match using an optimized exec loop.
 * Avoids Array allocations associated with string.match().
 * Note: The regular expression MUST have the 'g' (global) flag set.
 * ⚡ Bolt: Replaces (str.match(/.../g) || []).length
 */
export function countMatches(str: string, regex: RegExp): number {
  if (!regex.global) {
    // If global flag is missing, exec would loop infinitely on the same match
    throw new Error('countMatches requires a global RegExp')
  }

  // Reset regex state before using
  regex.lastIndex = 0
  let count = 0
  while (regex.exec(str) !== null) {
    count++
  }
  return count
}
