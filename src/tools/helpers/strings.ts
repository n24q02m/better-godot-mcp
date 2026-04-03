/**
 * String parsing utilities
 */

/**
 * Optimizes the parsing of comma-separated lists to avoid the memory overhead
 * of intermediate arrays created by `.split().map().filter()`.
 * Uses a single-pass manual loop to find delimiters and trims whitespace and quotes in-place.
 */
export function parseCommaSeparatedList(str: string): string[] {
  const result: string[] = []
  let start = 0
  const len = str.length

  while (start < len) {
    const commaIdx = str.indexOf(',', start)
    const end = commaIdx === -1 ? len : commaIdx

    // Trim spaces and quotes manually
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
