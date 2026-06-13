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
 * Efficiently count occurrences of a substring within a string without allocations.
 * @deprecated Use countMatches instead for better flexibility with RegExp support.
 */
export function countSubstring(str: string, search: string): number {
  return countMatches(str, search)
}

/**
 * Efficiently count occurrences of a substring or global Regular Expression within a string.
 * Uses indexOf for strings and matchAll iterators for RegExp to avoid full array allocations.
 */
export function countMatches(str: string, search: string | RegExp): number {
  if (!search) return 0

  if (typeof search === 'string') {
    let count = 0
    let pos = str.indexOf(search)
    while (pos !== -1) {
      count++
      pos = str.indexOf(search, pos + search.length)
    }
    return count
  }

  if (!search.global) {
    // Return 1 if it matches once, or 0. But for "count", usually we expect global.
    // However, matchAll requires global. Let's be strict to prevent misuse in hot paths.
    return str.match(search) ? 1 : 0
  }

  let count = 0
  for (const _ of str.matchAll(search)) {
    count++
  }
  return count
}
