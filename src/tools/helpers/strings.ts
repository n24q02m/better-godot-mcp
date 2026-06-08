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
 * Count non-overlapping occurrences of a substring.
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
 * Count occurrences of a regular expression, avoiding array allocations.
 * Note: If the regex is not global, it will return at most 1.
 */
export function countMatches(regex: RegExp, str: string): number {
  if (!regex.global) {
    return regex.test(str) ? 1 : 0
  }

  // Use a local copy of lastIndex to avoid side effects on shared regex objects
  const originalLastIndex = regex.lastIndex
  regex.lastIndex = 0
  let count = 0
  let match: RegExpExecArray | null

  // biome-ignore lint/suspicious/noAssignInExpressions: standard RegExp.exec loop
  while ((match = regex.exec(str)) !== null) {
    count++
    // Prevent infinite loop on zero-width matches
    if (match[0].length === 0) {
      regex.lastIndex++
    }
  }

  regex.lastIndex = originalLastIndex
  return count
}
