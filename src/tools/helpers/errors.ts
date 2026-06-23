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
 * Format successful MCP response
 */
export function formatSuccess(text: string): { content: Array<{ type: 'text'; text: string }> } {
  return { content: [{ type: 'text', text }] }
}

/**
 * Format successful JSON MCP response
 */
export function formatJSON(data: unknown): { content: Array<{ type: 'text'; text: string }> } {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
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

  // 1-4. Priority: Exact, Prefix, and containment matches
  let bestOption: string | null = null
  let bestPriority = 5 // Higher than any matching priority
  let minLenDiff = Number.POSITIVE_INFINITY

  for (const option of validOptions) {
    const optionLower = option.toLowerCase()
    const lenDiff = Math.abs(optionLower.length - lower.length)
    let currentPriority = 5

    if (optionLower === lower) {
      return option // 1. Priority: Exact match (case-insensitive)
    }

    if (optionLower.startsWith(lower)) {
      currentPriority = 2
    } else if (optionLower.includes(lower)) {
      currentPriority = 3
    } else if (lower.startsWith(optionLower)) {
      currentPriority = 4
    }

    if (currentPriority < 5) {
      if (currentPriority < bestPriority) {
        bestPriority = currentPriority
        minLenDiff = lenDiff
        bestOption = option
      } else if (currentPriority === bestPriority && lenDiff < minLenDiff) {
        minLenDiff = lenDiff
        bestOption = option
      }
    }
  }

  if (bestOption !== null) return bestOption

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
