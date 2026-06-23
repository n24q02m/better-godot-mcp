/**
 * String parsing utilities
 */

/**
 * Fast-path string trimming for a specific range within a string.
 * Returns the new start and end indices without allocating a new string.
 * Uses charCodeAt(i) <= 32 to match Godot's whitespace definition.
 */
export function fastTrimRange(str: string, start: number, end: number): { start: number; end: number } {
  let s = start
  let e = end

  while (s < e && str.charCodeAt(s) <= 32) s++
  while (e > s && str.charCodeAt(e - 1) <= 32) e--

  return { start: s, end: e }
}

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
 */
export function countSubstring(str: string, search: string): number {
  if (!search) return 0
  let count = 0
  let pos = str.indexOf(search)
  while (pos !== -1) {
    count++
    pos = str.indexOf(search, pos + search.length)
  }
  return count
}
