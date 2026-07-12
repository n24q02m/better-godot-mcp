/**
 * Error handling utilities for Better Godot MCP
 */

export type GodotMCPErrorCode =
  | 'GODOT_NOT_FOUND'
  | 'VERSION_MISMATCH'
  | 'PROJECT_NOT_FOUND'
  | 'SCENE_ERROR'
  | 'SCRIPT_ERROR'
  | 'NODE_ERROR'
  | 'PARSE_ERROR'
  | 'CONNECTION_ERROR'
  | 'INVALID_ACTION'
  | 'INVALID_ARGS'
  | 'EXECUTION_ERROR'
  | 'RESOURCE_ERROR'
  | 'INPUT_ERROR'
  | 'SIGNAL_ERROR'
  | 'ANIMATION_ERROR'
  | 'TILEMAP_ERROR'
  | 'SHADER_ERROR'
  | 'PHYSICS_ERROR'
  | 'AUDIO_ERROR'
  | 'NAVIGATION_ERROR'
  | 'UI_ERROR'

export class GodotMCPError extends Error {
  constructor(
    message: string,
    public readonly code: GodotMCPErrorCode,
    public readonly suggestion?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'GodotMCPError'
  }
}

/**
 * Format error for MCP response
 */
export function formatError(error: unknown): { content: Array<{ type: 'text'; text: string }>; isError: true } {
  if (error instanceof GodotMCPError) {
    let text = `Error [${error.code}]: ${error.message}`
    if (error.suggestion) {
      text += `\nSuggestion: ${error.suggestion}`
    }
    if (error.details) {
      text += `\nDetails: ${JSON.stringify(error.details, null, 2)}`
    }
    return { content: [{ type: 'text', text }], isError: true }
  }

  if (error instanceof Error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true }
  }

  return { content: [{ type: 'text', text: `Unknown error: ${String(error)}` }], isError: true }
}

/**
 * Format successful MCP response.
 * structuredContent wraps the message so it satisfies the declared
 * `{type: "object"}` outputSchema (a bare string does not).
 */
export function formatSuccess(text: string): {
  content: Array<{ type: 'text'; text: string }>
  structuredContent: { message: string }
} {
  return { content: [{ type: 'text', text }], structuredContent: { message: text } }
}

/**
 * Format successful JSON MCP response.
 * Callers always pass a plain object (verified across all call sites); the cast
 * to Record<string, unknown> reflects that invariant without forcing every
 * named interface (ProjectInfo, SceneInfo, ...) to declare an index signature.
 */
export function formatJSON(data: unknown): {
  content: Array<{ type: 'text'; text: string }>
  structuredContent: Record<string, unknown>
} {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data as Record<string, unknown>,
  }
}

/**
 * Find the closest matching string from a list of valid options.
 * Uses a prioritized hierarchy:
 * 1. Case-insensitive exact match
 * 2. Option starts with input (Best length match)
 * 3. Option includes input (Best length match)
 * 4. Input starts with option (Best length match)
 * 5. Fuzzy bigram similarity (Dice coefficient)
 */
export function findClosestMatch(input: string, validOptions: string[]): string | null {
  if (!input || validOptions.length === 0) return null

  // Truncate to prevent CPU exhaustion from excessively long inputs
  const safeInput = input.length > 100 ? input.slice(0, 100) : input
  const lower = safeInput.toLowerCase()

  // 1. Priority: Exact match (case-insensitive)
  for (const option of validOptions) {
    if (option.toLowerCase() === lower) {
      return option
    }
  }

  // 2-4. Priority: Prefix and containment matches
  let bestStartsWith: string | null = null
  let minLenDiffStartsWith = Number.POSITIVE_INFINITY

  let bestIncludes: string | null = null
  let minLenDiffIncludes = Number.POSITIVE_INFINITY

  let bestInputStartsWith: string | null = null
  let minLenDiffInputStartsWith = Number.POSITIVE_INFINITY

  for (const option of validOptions) {
    const optionLower = option.toLowerCase()
    const lenDiff = Math.abs(optionLower.length - lower.length)

    if (optionLower.startsWith(lower)) {
      if (lenDiff < minLenDiffStartsWith) {
        minLenDiffStartsWith = lenDiff
        bestStartsWith = option
      }
    } else if (optionLower.includes(lower)) {
      if (lenDiff < minLenDiffIncludes) {
        minLenDiffIncludes = lenDiff
        bestIncludes = option
      }
    } else if (lower.startsWith(optionLower)) {
      if (lenDiff < minLenDiffInputStartsWith) {
        minLenDiffInputStartsWith = lenDiff
        bestInputStartsWith = option
      }
    }
  }

  if (bestStartsWith !== null) return bestStartsWith
  if (bestIncludes !== null) return bestIncludes
  if (bestInputStartsWith !== null) return bestInputStartsWith

  // 5. Fallback: Fuzzy matching using bigram similarity
  let bestFuzzyMatch: string | null = null
  let bestScore = 0

  const inputBigrams = new Set<string>()
  for (let i = 0; i < lower.length - 1; i++) {
    inputBigrams.add(lower.slice(i, i + 2))
  }

  for (const option of validOptions) {
    const optionLower = option.toLowerCase()
    const optionBigrams = new Set<string>()
    for (let i = 0; i < optionLower.length - 1; i++) {
      optionBigrams.add(optionLower.slice(i, i + 2))
    }

    let overlap = 0
    for (const bigram of optionBigrams) {
      if (inputBigrams.has(bigram)) overlap++
    }

    const total = inputBigrams.size + optionBigrams.size
    if (total === 0) continue

    const score = (2 * overlap) / total
    if (score > bestScore && score > 0.4) {
      bestScore = score
      bestFuzzyMatch = option
    }
  }

  return bestFuzzyMatch
}

/**
 * Throw a standardized "Unknown action" error with valid actions listed.
 */
export function throwUnknownAction(action: string, validActions: string[]): never {
  // Truncate to prevent log bloat and memory issues from excessively long inputs
  const safeAction = action.length > 100 ? `${action.slice(0, 100)}...` : action
  const closest = findClosestMatch(safeAction, validActions)
  const suggestion = closest ? ` Did you mean '${closest}'?` : ''
  throw new GodotMCPError(
    `Unknown action: ${safeAction}.${suggestion}`,
    'INVALID_ACTION',
    `Valid actions: ${validActions.join(', ')}. Use help tool for full docs.`,
  )
}
