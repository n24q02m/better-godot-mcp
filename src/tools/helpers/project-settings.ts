/**
 * Project Settings Parser - Parse and modify Godot project.godot files
 *
 * project.godot uses a custom INI-like format:
 * [section]
 * key=value
 * key/subkey=value
 */

import { readFileSync, writeFileSync } from 'node:fs'

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
 * Parse project.godot content string
 */
export function parseProjectSettingsContent(content: string): ProjectSettings {
  const sections = new Map<string, Map<string, string>>()
  let currentSection = ''

  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const line = rawLine.trim()
    if (!line || line.startsWith(';')) continue

    // Section header
    const sectionMatch = line.match(/^\[(.+)\]$/)
    if (sectionMatch) {
      currentSection = sectionMatch[1]
      if (!sections.has(currentSection)) {
        sections.set(currentSection, new Map())
      }
      continue
    }

    // Key=value
    const kvMatch = line.match(/^([^=]+)=(.*)$/)
    if (kvMatch && currentSection) {
      const key = kvMatch[1].trim()
      let value = kvMatch[2].trim()

      // Handle multi-line values (e.g. dictionaries/arrays starting with { and not ending with })
      // Godot format usually puts } on a new line for complex structures
      if (value.startsWith('{') && !value.endsWith('}')) {
        // Accumulate subsequent lines until closing brace
        while (i + 1 < lines.length) {
          const nextLine = lines[i + 1]
          const trimmedNext = nextLine.trim()

          value += `\n${nextLine}` // Preserve indentation in value
          i++

          if (trimmedNext.endsWith('}')) {
            break
          }
        }
      }

      sections.get(currentSection)?.set(key, value)
    }
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

      // Check if existing value was multi-line and skip its lines
      const existingValueStart = trimmed.substring(key.length + 1).trim()
      if (existingValueStart.startsWith('{') && !existingValueStart.endsWith('}')) {
        while (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim()
          if (nextLine.endsWith('}')) {
            i++ // Skip the closing brace line too
            break
          }
          i++
        }
      }
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
    if (result.length > 0 && result[result.length - 1] !== '') {
      result.push('')
    }
    result.push(sectionHeader)
    result.push(`${key}=${value}`)
  }

  return result.join('\n')
}

/**
 * Remove a setting from project.godot content
 */
export function removeSettingInContent(content: string, path: string): string {
  const parts = path.split('/')
  if (parts.length < 2) return content

  const section = parts[0]
  const key = parts.slice(1).join('/')
  const sectionHeader = `[${section}]`
  const lines = content.split('\n')
  const result: string[] = []
  let inSection = false

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()

    // Check for section header
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      inSection = trimmed === sectionHeader
    }

    // Remove existing key in current section
    if (inSection && trimmed.startsWith(`${key}=`)) {
      // Check if existing value was multi-line and skip its lines
      const existingValueStart = trimmed.substring(key.length + 1).trim()
      if (existingValueStart.startsWith('{') && !existingValueStart.endsWith('}')) {
        while (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim()
          if (nextLine.endsWith('}')) {
            i++ // Skip the closing brace line too
            break
          }
          i++
        }
      }
      // Do not push the line(s) to result
      continue
    }

    result.push(lines[i])
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
