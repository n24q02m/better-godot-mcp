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
 * Efficiently counts occurrences of a regex in a string without allocating an intermediate array.
 * Uses matchAll to avoid the overhead of match().length which creates an intermediate array.
 */
export function countMatches(str: string, regex: RegExp): number {
  let count = 0
  for (const _ of str.matchAll(regex)) {
    count++
  }
  return count
}

/**
 * Efficiently counts occurrences of a substring in a string without allocating an intermediate array.
 * Uses indexOf in a loop to avoid the overhead of match().length or split().length.
 */
export function countString(str: string, search: string): number {
  if (!search) return 0
  let count = 0
  let pos = str.indexOf(search)
  while (pos !== -1) {
    count++
    pos = str.indexOf(search, pos + search.length)
  }
  return count
}
