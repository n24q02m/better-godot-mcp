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

  let bestLevel = 6 // 1: Exact, 2: StartsWith, 3: Includes, 4: InputStartsWith, 5: Fuzzy, 6: None
  let bestMatch: string | null = null
  let minLenDiff = Number.POSITIVE_INFINITY
  let bestFuzzyScore = 0

  let inputBigrams: Set<string> | null = null

  for (const option of validOptions) {
    const optionLower = option.toLowerCase()

    // Level 1: Exact match (case-insensitive)
    if (optionLower === lower) return option

    const lenDiff = Math.abs(optionLower.length - lower.length)

    // Level 2: Option starts with input
    if (optionLower.startsWith(lower)) {
      if (bestLevel > 2 || (bestLevel === 2 && lenDiff < minLenDiff)) {
        bestLevel = 2
        bestMatch = option
        minLenDiff = lenDiff
      }
      continue
    }

    if (bestLevel <= 2) continue

    // Level 3: Option includes input
    if (optionLower.includes(lower)) {
      if (bestLevel > 3 || (bestLevel === 3 && lenDiff < minLenDiff)) {
        bestLevel = 3
        bestMatch = option
        minLenDiff = lenDiff
      }
      continue
    }

    if (bestLevel <= 3) continue

    // Level 4: Input starts with option
    if (lower.startsWith(optionLower)) {
      if (bestLevel > 4 || (bestLevel === 4 && lenDiff < minLenDiff)) {
        bestLevel = 4
        bestMatch = option
        minLenDiff = lenDiff
      }
      continue
    }

    if (bestLevel <= 4) continue

    // Level 5: Fuzzy matching (Dice Coefficient)
    if (inputBigrams === null) {
      inputBigrams = new Set<string>()
      for (let i = 0; i < lower.length - 1; i++) {
        inputBigrams.add(lower.slice(i, i + 2))
      }
    }

    if (inputBigrams.size === 0) continue

    const optionBigrams = new Set<string>()
    for (let i = 0; i < optionLower.length - 1; i++) {
      optionBigrams.add(optionLower.slice(i, i + 2))
    }

    let overlap = 0
    for (const bigram of optionBigrams) {
      if (inputBigrams.has(bigram)) overlap++
    }

    const total = inputBigrams.size + optionBigrams.size
    const score = total === 0 ? 0 : (2 * overlap) / total
    if (score > 0.4 && score > bestFuzzyScore) {
      bestFuzzyScore = score
      bestMatch = option
      bestLevel = 5
    }
  }

  return bestMatch
}

/**
 * Throw a standardized "Unknown action" error with valid actions listed.
 */
export function throwUnknownAction(action: string, validActions: string[]): never {
  // Truncate to prevent log bloat and memory issues from excessively long inputs
  const safeAction = action.length > 100 ? `${action.slice(0, 100)}...` : action
  const closest = findClosestMatch(safeAction, validActions)
  const suggestion = closest ? ` Did you mean '${closest}'?` : ''

  const displayedActions = validActions.slice(0, 20)
  const remainingCount = validActions.length - 20
  const actionsList = remainingCount > 0
    ? `${displayedActions.join(', ')}... and ${remainingCount} more`
    : displayedActions.join(', ')

  throw new GodotMCPError(
    `Unknown action: ${safeAction}.${suggestion}`,
    'INVALID_ACTION',
    `Valid actions: ${actionsList}. Use help tool for full docs.`,
  )
}
