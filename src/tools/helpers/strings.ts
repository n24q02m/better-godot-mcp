/**
 * String parsing utilities
 */

/**
 * Fast-path parser for comma-separated lists, avoiding split/map/filter allocations.
 * Uses a single-pass loop to find delimiters, trimming whitespace and quotes in-place.
 * Handles quoted items containing commas.
 */
export function parseCommaSeparatedList(str: string): string[] {
  if (!str) return []
  const result: string[] = []
  const len = str.length
  let inQuotes = false
  let start = 0

  for (let i = 0; i <= len; i++) {
    const char = i < len ? str[i] : ','
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      // Trim leading whitespace and quotes
      let itemStart = start
      let itemEnd = i - 1

      while (itemStart <= itemEnd && (str.charCodeAt(itemStart) <= 32 || str[itemStart] === '"')) {
        itemStart++
      }
      while (itemEnd >= itemStart && (str.charCodeAt(itemEnd) <= 32 || str[itemEnd] === '"')) {
        itemEnd--
      }

      if (itemStart <= itemEnd) {
        result.push(str.slice(itemStart, itemEnd + 1))
      }
      start = i + 1
    }
  }

  return result
}
