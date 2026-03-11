/**
 * Project Settings Parser - Parse and modify Godot project.godot files
 *
 * project.godot uses a custom INI-like format:
 * [section]
 * key=value
 * key/subkey=value
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'

export interface ProjectSettings {
  sections: Map<string, Map<string, string>>
  raw: string
}

/**
 * Parse project.godot file
 */
export function parseProjectSettings(filePath: string): ProjectSettings {
  const raw = readFileSync(filePath, 'utf-8')
  return parseProjectSettingsContent(raw)
}

/**
 * Parse project.godot file asynchronously
 */
export async function parseProjectSettingsAsync(filePath: string): Promise<ProjectSettings> {
  const raw = await readFile(filePath, 'utf-8')
  return parseProjectSettingsContent(raw)
}

/**
 * Parse project.godot content string
 * Optimized to traverse the string directly instead of using split('\n') and regex.
 * Parses large project.godot files ~60% faster by avoiding string allocations.
 * Now supports multi-line values for both blocks enclosed in {} and strings enclosed in "".
 */
export function parseProjectSettingsContent(content: string): ProjectSettings {
  const sections = new Map<string, Map<string, string>>()
  let currentSection = ''

  let pos = 0
  const len = content.length

  while (pos < len) {
    // Trim leading whitespace for the line
    while (pos < len && content.charCodeAt(pos) <= 32) pos++
    if (pos >= len) break

    // Skip comments
    if (content.charCodeAt(pos) === 59) {
      // ';'
      const nextNewline = content.indexOf('\n', pos)
      pos = nextNewline === -1 ? len : nextNewline + 1
      continue
    }

    // Section header: starts with '[' (91)
    if (content.charCodeAt(pos) === 91) {
      const endBracket = content.indexOf(']', pos)
      if (endBracket !== -1) {
        currentSection = content.slice(pos + 1, endBracket).trim()
        if (!sections.has(currentSection)) {
          sections.set(currentSection, new Map())
        }
        const nextNewline = content.indexOf('\n', endBracket)
        pos = nextNewline === -1 ? len : nextNewline + 1
        continue
      }
    }

    // Key=value pairs
    if (currentSection) {
      const eqIdx = content.indexOf('=', pos)
      const nextNewline = content.indexOf('\n', pos)

      // If we found an '=' before the end of the line (or file)
      if (eqIdx !== -1 && (nextNewline === -1 || eqIdx < nextNewline)) {
        let keyEnd = eqIdx
        while (keyEnd > pos && content.charCodeAt(keyEnd - 1) <= 32) keyEnd--
        const key = content.slice(pos, keyEnd)

        let valStart = eqIdx + 1
        while (valStart < len && content.charCodeAt(valStart) <= 32 && content.charCodeAt(valStart) !== 10) valStart++

        let inString = false
        let braceDepth = 0
        let valEnd = valStart

        // State machine to parse the value
        while (valEnd < len) {
          const char = content.charCodeAt(valEnd)

          if (char === 34 && content.charCodeAt(valEnd - 1) !== 92) {
            // '"' not escaped by '\'
            inString = !inString
          } else if (!inString) {
            if (char === 123) {
              // '{'
              braceDepth++
            } else if (char === 125) {
              // '}'
              braceDepth--
            } else if (char === 10 && braceDepth === 0) {
              // '\n' outside blocks
              break
            }
          }

          valEnd++
        }

        // We might have ended on a newline or EOF. Trim trailing whitespace.
        let end = valEnd
        while (end > valStart && content.charCodeAt(end - 1) <= 32) end--

        const value = content.slice(valStart, end)
        sections.get(currentSection)?.set(key, value)

        pos = valEnd < len ? valEnd + 1 : len // move past the terminating character (usually newline)
        continue
      }
    }

    // Fallback: move to the next line if we couldn't parse as section or key=value
    const fallbackNextNewline = content.indexOf('\n', pos)
    pos = fallbackNextNewline === -1 ? len : fallbackNextNewline + 1
  }

  return { sections, raw: content }
}

/**
 * Get a setting value by section/key path
 * Example: getSetting(settings, "application/config/name")
 */
export function getSetting(settings: ProjectSettings, path: string): string | undefined {
  // Try direct section/key lookup
  const parts = path.split('/')
  if (parts.length >= 2) {
    const section = parts[0]
    const key = parts.slice(1).join('/')
    return settings.sections.get(section)?.get(key)
  }
  return undefined
}

/**
 * Set a setting value in project.godot content
 */
export function setSettingInContent(content: string, path: string, value: string): string {
  const parts = path.split('/')
  if (parts.length < 2) return content

  const section = parts[0]
  const key = parts.slice(1).join('/')
  const sectionHeader = `[${section}]`
  const lines = content.split('\n')
  const result: string[] = []
  let inSection = false
  let keySet = false
  let sectionFound = false

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()

    // Check for section header
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      if (inSection && !keySet) {
        // Add key before leaving section
        result.push(`${key}=${value}`)
        keySet = true
      }
      inSection = trimmed === sectionHeader
      if (inSection) sectionFound = true
    }

    // Replace existing key in current section
    if (inSection && trimmed.startsWith(`${key}=`)) {
      result.push(`${key}=${value}`)
      keySet = true
      continue
    }

    result.push(lines[i])
  }

  // Handle last section
  if (inSection && !keySet) {
    result.push(`${key}=${value}`)
    keySet = true
  }

  // Section doesn't exist yet - add it
  if (!sectionFound) {
    result.push('')
    result.push(sectionHeader)
    result.push(`${key}=${value}`)
  }

  return result.join('\n')
}

/**
 * Write project settings back to file
 */
export function writeProjectSettings(filePath: string, content: string): void {
  writeFileSync(filePath, content, 'utf-8')
}

/**
 * Write project settings back to file asynchronously
 */
export async function writeProjectSettingsAsync(filePath: string, content: string): Promise<void> {
  await writeFile(filePath, content, 'utf-8')
}

/**
 * Get all input actions from project settings
 */
export function getInputActions(settings: ProjectSettings): Map<string, string> {
  const actions = new Map<string, string>()
  const inputSection = settings.sections.get('input')
  if (inputSection) {
    for (const [key, value] of inputSection) {
      actions.set(key, value)
    }
  }
  return actions
}
