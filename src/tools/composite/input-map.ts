/**
 * Input Map tool - Input action management via project.godot
 * Actions: list | add_action | remove_action | add_event
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError } from '../helpers/errors.js'

function getProjectGodotPath(projectPath: string | null | undefined): string {
  if (!projectPath) throw new GodotMCPError('No project path specified', 'INVALID_ARGS', 'Provide project_path.')
  const configPath = join(resolve(projectPath), 'project.godot')
  if (!existsSync(configPath))
    throw new GodotMCPError('No project.godot found', 'PROJECT_NOT_FOUND', 'Verify the project path.')
  return configPath
}

/**
 * Parse input actions from project.godot
 */
function parseInputActions(content: string): Map<string, string[]> {
  const actions = new Map<string, string[]>()
  let inInputSection = false

  for (const line of content.split('\n')) {
    const trimmed = line.trim()

    if (trimmed === '[input]') {
      inInputSection = true
      continue
    }
    if (trimmed.startsWith('[') && inInputSection) {
      break
    }

    if (inInputSection) {
      // Single-line format: action_name={...}
      const match = trimmed.match(/^(\w+)=\{(.+)\}$/)
      if (match) {
        const actionName = match[1]
        const eventsMatch = match[2].match(/"events":\s*\[([^\]]*)\]/)
        const events = eventsMatch
          ? eventsMatch[1]
              .split(',')
              .map((e) => e.trim())
              .filter(Boolean)
          : []
        actions.set(actionName, events)
      } else {
        // Multi-line format: action_name={
        //   "deadzone": 0.2,
        //   "events": [...]
        // }
        const startMatch = trimmed.match(/^(\w+)=\{(.*)$/)
        if (startMatch) {
          const actionName = startMatch[1]
          let accumulated = startMatch[2]
          // Read subsequent lines until closing }
          const lines = content.split('\n')
          const currentIdx = lines.findIndex((l) => l.trim() === trimmed)
          if (currentIdx >= 0) {
            for (let j = currentIdx + 1; j < lines.length; j++) {
              const nextLine = lines[j].trim()
              accumulated += nextLine
              if (nextLine.endsWith('}')) break
            }
          }
          const eventsMatch = accumulated.match(/"events":\s*\[([^\]]*)\]/)
          const events = eventsMatch
            ? eventsMatch[1]
                .split(',')
                .map((e) => e.trim())
                .filter(Boolean)
            : []
          actions.set(actionName, events)
        }
      }
    }
  }

  return actions
}

export async function handleInputMap(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const projectPath = (args.project_path as string) || config.projectPath

  switch (action) {
    case 'list': {
      const configPath = getProjectGodotPath(projectPath)
      const content = readFileSync(configPath, 'utf-8')
      const actions = parseInputActions(content)

      const actionList = Array.from(actions.entries()).map(([name, events]) => ({
        name,
        eventCount: events.length,
      }))

      return formatJSON({ count: actionList.length, actions: actionList })
    }

    case 'add_action': {
      const configPath = getProjectGodotPath(projectPath)
      const actionName = args.action_name as string
      if (!actionName) throw new GodotMCPError('No action_name specified', 'INVALID_ARGS', 'Provide action_name.')
      const deadzone = (args.deadzone as number) || 0.5

      let content = readFileSync(configPath, 'utf-8')

      // Check if [input] section exists
      if (!content.includes('[input]')) {
        content += `\n[input]\n`
      }

      // Check if action already exists
      if (content.includes(`${actionName}={`)) {
        throw new GodotMCPError(`Action "${actionName}" already exists`, 'INPUT_ERROR', 'Remove it first to recreate.')
      }

      // Add action after [input] section header
      const actionLine = `${actionName}={\n"deadzone": ${deadzone},\n"events": []\n}`
      content = content.replace('[input]', `[input]\n${actionLine}`)

      writeFileSync(configPath, content, 'utf-8')
      return formatSuccess(`Added input action: ${actionName} (deadzone: ${deadzone})`)
    }

    case 'remove_action': {
      const configPath = getProjectGodotPath(projectPath)
      const actionName = args.action_name as string
      if (!actionName) throw new GodotMCPError('No action_name specified', 'INVALID_ARGS', 'Provide action_name.')

      const content = readFileSync(configPath, 'utf-8')
      // Remove the action line(s) - handles multi-line format
      const pattern = new RegExp(`${actionName}=\\{[^}]*\\}\\n?`, 'g')
      const updated = content.replace(pattern, '')

      if (updated === content) {
        throw new GodotMCPError(`Action "${actionName}" not found`, 'INPUT_ERROR', 'Check action name with list.')
      }

      writeFileSync(configPath, updated, 'utf-8')
      return formatSuccess(`Removed input action: ${actionName}`)
    }

    case 'add_event': {
      const configPath = getProjectGodotPath(projectPath)
      const actionName = args.action_name as string
      const eventType = args.event_type as string
      const eventValue = args.event_value as string
      if (!actionName || !eventType || !eventValue) {
        throw new GodotMCPError(
          'action_name, event_type, and event_value required',
          'INVALID_ARGS',
          'Provide action_name, event_type (key/mouse/joypad), and event_value (e.g., "KEY_SPACE").',
        )
      }

      const content = readFileSync(configPath, 'utf-8')

      // Build event object based on type
      let eventObj: string
      switch (eventType) {
        case 'key':
          eventObj = `Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":${eventValue},"key_label":0,"unicode":0,"location":0,"echo":false,"script":null)`
          break
        case 'mouse':
          eventObj = `Object(InputEventMouseButton,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"button_mask":0,"position":Vector2(0,0),"global_position":Vector2(0,0),"factor":1.0,"button_index":${eventValue},"canceled":false,"pressed":true,"double_click":false,"script":null)`
          break
        case 'joypad':
          eventObj = `Object(InputEventJoypadButton,"resource_local_to_scene":false,"resource_name":"","device":-1,"button_index":${eventValue},"pressure":0.0,"pressed":true,"script":null)`
          break
        default:
          throw new GodotMCPError(
            `Unknown event_type: ${eventType}`,
            'INVALID_ARGS',
            'Valid types: key, mouse, joypad.',
          )
      }

      // Find existing events array and append
      const actionRegex = new RegExp(`(${actionName}=\\{[^}]*"events":\\s*\\[)([^\\]]*)\\]`)
      const match = content.match(actionRegex)
      if (!match) {
        throw new GodotMCPError(
          `Action "${actionName}" not found`,
          'INPUT_ERROR',
          'Add the action first with add_action.',
        )
      }

      const existingEvents = match[2].trim()
      const newEvents = existingEvents ? `${existingEvents}, ${eventObj}` : eventObj
      const updated = content.replace(actionRegex, `$1${newEvents}]`)

      writeFileSync(configPath, updated, 'utf-8')
      return formatSuccess(`Added ${eventType} event to action: ${actionName}`)
    }

    default:
      throw new GodotMCPError(
        `Unknown action: ${action}`,
        'INVALID_ACTION',
        'Valid actions: list, add_action, remove_action, add_event. Use help tool for full docs.',
      )
  }
}
