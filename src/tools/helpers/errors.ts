/**
 * Error handling utilities for Better Godot MCP
 */

export type GodotMCPErrorCode =
  | 'GODOT_NOT_FOUND'
  | 'VERSION_MISMATCH'
  | 'PROJECT_NOT_FOUND'
  | 'PROCESS_NOT_FOUND'
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
  const inputLen = lower.length

  // 1. Priority: Exact match (case-insensitive)
  for (let i = 0; i < validOptions.length; i++) {
    if (validOptions[i].toLowerCase() === lower) {
      return validOptions[i]
    }
  }

  // 2-4. Priority: Prefix and containment matches
  let bestStartsWith: string | null = null
  let minLenDiffStartsWith = Number.POSITIVE_INFINITY

  let bestIncludes: string | null = null
  let minLenDiffIncludes = Number.POSITIVE_INFINITY

  let bestInputStartsWith: string | null = null
  let minLenDiffInputStartsWith = Number.POSITIVE_INFINITY

  for (let i = 0; i < validOptions.length; i++) {
    const option = validOptions[i]
    const optionLower = option.toLowerCase()
    const optionLen = optionLower.length
    const lenDiff = Math.abs(optionLen - inputLen)

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
  // ⚡ Bolt: Optimize fuzzy matching using Uint32Array and mathematical bigram encoding
  let bestFuzzyMatch: string | null = null
  let bestScore = 0

  const inputBigrams = new Uint32Array(Math.max(0, inputLen - 1))
  for (let i = 0; i < inputLen - 1; i++) {
    inputBigrams[i] = lower.charCodeAt(i) * 65536 + lower.charCodeAt(i + 1)
  }
  inputBigrams.sort()

  let uniqueInputBigramsCount = 0
  if (inputBigrams.length > 0) {
    uniqueInputBigramsCount = 1
    for (let i = 1; i < inputBigrams.length; i++) {
      if (inputBigrams[i] !== inputBigrams[i - 1]) {
        inputBigrams[uniqueInputBigramsCount++] = inputBigrams[i]
      }
    }
  }

  for (let i = 0; i < validOptions.length; i++) {
    const option = validOptions[i]
    const optionLower = option.toLowerCase()
    const optionLen = optionLower.length

    if (optionLen > 1 && inputLen > 1) {
      const optionBigrams = new Uint32Array(optionLen - 1)
      for (let j = 0; j < optionLen - 1; j++) {
        optionBigrams[j] = optionLower.charCodeAt(j) * 65536 + optionLower.charCodeAt(j + 1)
      }
      optionBigrams.sort()

      let uniqueOptionBigramsCount = 0
      if (optionBigrams.length > 0) {
        uniqueOptionBigramsCount = 1
        for (let j = 1; j < optionBigrams.length; j++) {
          if (optionBigrams[j] !== optionBigrams[j - 1]) {
            optionBigrams[uniqueOptionBigramsCount++] = optionBigrams[j]
          }
        }
      }

      let overlap = 0
      let idx1 = 0
      let idx2 = 0

      while (idx1 < uniqueInputBigramsCount && idx2 < uniqueOptionBigramsCount) {
        const bg1 = inputBigrams[idx1]
        const bg2 = optionBigrams[idx2]
        if (bg1 === bg2) {
          overlap++
          idx1++
          idx2++
        } else if (bg1 < bg2) {
          idx1++
        } else {
          idx2++
        }
      }

      const total = uniqueInputBigramsCount + uniqueOptionBigramsCount
      const score = total > 0 ? (2 * overlap) / total : 0

      if (score > bestScore && score > 0.4) {
        bestScore = score
        bestFuzzyMatch = option
      }
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
