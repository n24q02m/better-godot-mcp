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
 * Counts occurrences of a substring in a string without creating an array.
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

/**
 * Counts occurrences of a regular expression match in a string without creating an array.
 * Note: The regex should have the 'g' flag for multiple matches.
 */
export function countMatches(str: string, regex: RegExp): number {
  if (!regex.global) {
    return regex.test(str) ? 1 : 0
  }
  let count = 0
  regex.lastIndex = 0
  while (regex.exec(str) !== null) {
    count++
  }
  return count
}
