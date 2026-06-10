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
 * Efficiently counts occurrences of a substring or global RegExp in a string.
 * Uses matchAll for RegExp to avoid intermediate array allocations,
 * and a simple indexOf loop for strings.
 */
export function countMatches(str: string, search: string | RegExp): number {
  if (!str) return 0
  if (typeof search === 'string') {
    if (search.length === 0) return 0
    let count = 0
    let pos = str.indexOf(search)
    while (pos !== -1) {
      count++
      pos = str.indexOf(search, pos + search.length)
    }
    return count
  }

  if (!search.global) {
    // Re-create the RegExp with global flag if missing
    const globalSearch = new RegExp(search.source, search.flags + 'g')
    let count = 0
    for (const _ of str.matchAll(globalSearch)) {
      count++
    }
    return count
  }

  let count = 0
  for (const _ of str.matchAll(search)) {
    count++
  }
  return count
}
