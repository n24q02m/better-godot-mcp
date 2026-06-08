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
 * Count occurrences of a substring within a string without allocations.
 * Guarded against infinite loops with empty search strings.
 */
export function countString(str: string, search: string): number {
  if (!search || !str) return 0
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
 * Count occurrences of a regex pattern within a string using a non-allocating loop.
 * Requires the 'g' flag on the regex to avoid infinite loops.
 */
export function countMatches(str: string, regex: RegExp): number {
  if (!str) return 0
  let count = 0
  while (regex.exec(str) !== null) {
    count++
  }
  return count
}
