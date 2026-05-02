/**
 * Input Map tool - Input action management via project.godot
 * Actions: list | add_action | remove_action | add_event
 */

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
import { serializeGodotObject } from '../helpers/godot-types.js'
import { pathExists, safeResolve } from '../helpers/paths.js'
import { escapeRegExp } from '../helpers/scene-parser.js'

/**
 * Godot 4.x Key enum numeric values (@GlobalScope.Key)
 * Letters are ASCII codes, special keys use 4194xxx range
 */
const GODOT_KEY_CODES: Record<string, number> = {
  // Letters (ASCII)
  KEY_A: 65,
  KEY_B: 66,
  KEY_C: 67,
  KEY_D: 68,
  KEY_E: 69,
  KEY_F: 70,
  KEY_G: 71,
  KEY_H: 72,
  KEY_I: 73,
  KEY_J: 74,
  KEY_K: 75,
  KEY_L: 76,
  KEY_M: 77,
  KEY_N: 78,
  KEY_O: 79,
  KEY_P: 80,
  KEY_Q: 81,
  KEY_R: 82,
  KEY_S: 83,
  KEY_T: 84,
  KEY_U: 85,
  KEY_V: 86,
  KEY_W: 87,
  KEY_X: 88,
  KEY_Y: 89,
  KEY_Z: 90,
  // Numbers
  KEY_0: 48,
  KEY_1: 49,
  KEY_2: 50,
  KEY_3: 51,
  KEY_4: 52,
  KEY_5: 53,
  KEY_6: 54,
  KEY_7: 55,
  KEY_8: 56,
  KEY_9: 57,
  // Common keys
  KEY_SPACE: 32,
  KEY_ESCAPE: 4194305,
  KEY_TAB: 4194306,
  KEY_BACKSPACE: 4194308,
  KEY_ENTER: 4194309,
  KEY_INSERT: 4194311,
  KEY_DELETE: 4194312,
  KEY_PAUSE: 4194313,
  KEY_HOME: 4194315,
  KEY_END: 4194316,
  KEY_PAGEUP: 4194323,
  KEY_PAGEDOWN: 4194324,
  // Arrow keys
  KEY_LEFT: 4194319,
  KEY_UP: 4194320,
  KEY_RIGHT: 4194321,
  KEY_DOWN: 4194322,
  // Modifiers
  KEY_SHIFT: 4194325,
  KEY_CTRL: 4194326,
  KEY_ALT: 4194328,
  KEY_META: 4194329,
  // Function keys
  KEY_F1: 4194332,
  KEY_F2: 4194333,
  KEY_F3: 4194334,
  KEY_F4: 4194335,
  KEY_F5: 4194336,
  KEY_F6: 4194337,
  KEY_F7: 4194338,
  KEY_F8: 4194339,
  KEY_F9: 4194340,
  KEY_F10: 4194341,
  KEY_F11: 4194342,
  KEY_F12: 4194343,
}

/**
 * Godot 4.x MouseButton enum numeric values
 */
const GODOT_MOUSE_CODES: Record<string, number> = {
  MOUSE_BUTTON_LEFT: 1,
  MOUSE_BUTTON_RIGHT: 2,
  MOUSE_BUTTON_MIDDLE: 3,
  MOUSE_BUTTON_WHEEL_UP: 4,
  MOUSE_BUTTON_WHEEL_DOWN: 5,
  MOUSE_BUTTON_WHEEL_LEFT: 6,
  MOUSE_BUTTON_WHEEL_RIGHT: 7,
}

/**
 * Resolve a key name to its numeric Godot code.
 * Accepts both "KEY_SPACE" and raw numeric strings like "32".
 */
function resolveKeyCode(value: string): number {
  const upper = value.toUpperCase()
  if (upper in GODOT_KEY_CODES) return GODOT_KEY_CODES[upper]
  const parsed = Number.parseInt(value, 10)
  if (!Number.isNaN(parsed)) return parsed
  throw new GodotMCPError(
    `Unknown key: ${value}`,
    'INVALID_ARGS',
    `Valid keys: ${Object.keys(GODOT_KEY_CODES).join(', ')}`,
  )
}

/**
 * Resolve a mouse button name to its numeric Godot code.
 */
function resolveMouseCode(value: string): number {
  const upper = value.toUpperCase()
  if (upper in GODOT_MOUSE_CODES) return GODOT_MOUSE_CODES[upper]
  const parsed = Number.parseInt(value, 10)
  if (!Number.isNaN(parsed)) return parsed
  throw new GodotMCPError(
    `Unknown mouse button: ${value}`,
    'INVALID_ARGS',
    `Valid buttons: ${Object.keys(GODOT_MOUSE_CODES).join(', ')}`,
  )
}

/**
 * Fast-path parser for comma-separated lists, avoiding split/map/filter allocations.
 */
function parseEventsList(str: string): string[] {
  if (!str) return []
  const results: string[] = []
  let start = 0
  const len = str.length
  while (start < len) {
    let end = str.indexOf(',', start)
    if (end === -1) end = len
    let i = start
    while (i < end && str.charCodeAt(i) <= 32) i++
    let j = end - 1
    while (j >= i && str.charCodeAt(j) <= 32) j--
    if (i <= j) {
      results.push(str.slice(i, j + 1))
    }
    start = end + 1
  }
  return results
}

async function getProjectGodotPath(projectPath: string | null | undefined, baseDir: string): Promise<string> {
  if (!projectPath) throw new GodotMCPError('No project path specified', 'INVALID_ARGS', 'Provide project_path.')
  const configPath = join(safeResolve(baseDir, projectPath), 'project.godot')
  if (!(await pathExists(configPath)))
    throw new GodotMCPError('No project.godot found', 'PROJECT_NOT_FOUND', 'Verify the project path.')
  return configPath
}

/**
 * Parse input actions from project.godot
 */
function parseInputActions(content: string): Map<string, string[]> {
  const actions = new Map<string, string[]>()
  let inInputSection = false
  let currentActionName: string | null = null
  let currentActionAccumulator = ''

  let pos = 0
  const len = content.length

  while (pos < len) {
    let nextNewline = content.indexOf('\n', pos)
    if (nextNewline === -1) nextNewline = len

    // manual trim
    let start = pos
    let end = nextNewline
    while (start < end && content.charCodeAt(start) <= 32) start++
    while (end > start && content.charCodeAt(end - 1) <= 32) end--

    if (start < end) {
      const trimmed = content.slice(start, end)

      // Handle multi-line continuation
      if (currentActionName !== null) {
        currentActionAccumulator += trimmed
        if (trimmed.endsWith('}')) {
          // End of multi-line action
          const eventsMatch = currentActionAccumulator.match(/"events":\s*\[([^\]]*)\]/)
          const events = eventsMatch ? parseEventsList(eventsMatch[1]) : []
          actions.set(currentActionName, events)
          currentActionName = null
          currentActionAccumulator = ''
        }
      } else {
        if (trimmed === '[input]') {
          inInputSection = true
        } else if (trimmed.startsWith('[') && inInputSection) {
          // Stop if we hit another section
          inInputSection = false
          break
        } else if (inInputSection) {
          // Single-line format: action_name={...}
          const match = trimmed.match(/^(\w+)=\{(.+)\}$/)
          if (match) {
            const actionName = match[1]
            const eventsMatch = match[2].match(/"events":\s*\[([^\]]*)\]/)
            const events = eventsMatch ? parseEventsList(eventsMatch[1]) : []
            actions.set(actionName, events)
          } else {
            // Multi-line format start: action_name={
            //   "deadzone": 0.2,
            //   "events": [...]
            // }
            const startMatch = trimmed.match(/^(\w+)=\{(.*)$/)
            if (startMatch) {
              currentActionName = startMatch[1]
              currentActionAccumulator = startMatch[2]
            }
          }
        }
      }
    }

    pos = nextNewline + 1
  }

  return actions
}

export async function handleInputMap(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const baseDir = config.projectPath || process.cwd()
  const projectPath = (args.project_path as string) || config.projectPath

  switch (action) {
    case 'list': {
      const configPath = await getProjectGodotPath(projectPath, baseDir)
      const content = await readFile(configPath, 'utf-8')
      const actions = parseInputActions(content)

      // ⚡ Bolt: Removed Array.from(...).map(...) to prevent allocating intermediate arrays.
      const actionList = new Array(actions.size)
      let i = 0
      for (const [name, events] of actions) {
        actionList[i++] = { name, eventCount: events.length }
      }

      return formatJSON({ count: actionList.length, actions: actionList })
    }

    case 'add_action': {
      const configPath = await getProjectGodotPath(projectPath, baseDir)
      const actionName = args.action_name as string
      if (!actionName) throw new GodotMCPError('No action_name specified', 'INVALID_ARGS', 'Provide action_name.')
      if (typeof actionName !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(actionName)) {
        throw new GodotMCPError(
          `Invalid action name: ${actionName}`,
          'INVALID_ARGS',
          'Action names must contain only alphanumeric characters, underscores, and hyphens.',
        )
      }
      const deadzone = (args.deadzone as number) || 0.5

      let content = await readFile(configPath, 'utf-8')

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

      await writeFile(configPath, content, 'utf-8')
      return formatSuccess(`Added input action: ${actionName} (deadzone: ${deadzone})`)
    }

    case 'remove_action': {
      const configPath = await getProjectGodotPath(projectPath, baseDir)
      const actionName = args.action_name as string
      if (!actionName) throw new GodotMCPError('No action_name specified', 'INVALID_ARGS', 'Provide action_name.')
      if (typeof actionName !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(actionName)) {
        throw new GodotMCPError(
          `Invalid action name: ${actionName}`,
          'INVALID_ARGS',
          'Action names must contain only alphanumeric characters, underscores, and hyphens.',
        )
      }

      const content = await readFile(configPath, 'utf-8')
      // Remove the action line(s) - handles multi-line format
      const pattern = new RegExp(`${escapeRegExp(actionName)}=\\{[^}]*\\}\\n?`, 'g')
      const updated = content.replace(pattern, '')

      if (updated === content) {
        throw new GodotMCPError(`Action "${actionName}" not found`, 'INPUT_ERROR', 'Check action name with list.')
      }

      await writeFile(configPath, updated, 'utf-8')
      return formatSuccess(`Removed input action: ${actionName}`)
    }

    case 'add_event': {
      const configPath = await getProjectGodotPath(projectPath, baseDir)
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
      if (typeof actionName !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(actionName)) {
        throw new GodotMCPError(
          `Invalid action name: ${actionName}`,
          'INVALID_ARGS',
          'Action names must contain only alphanumeric characters, underscores, and hyphens.',
        )
      }

      const content = await readFile(configPath, 'utf-8')

      // Build event object based on type
      let eventObj: string
      switch (eventType) {
        case 'key': {
          const keyCode = resolveKeyCode(eventValue)
          eventObj = serializeGodotObject('InputEventKey', {
            resource_local_to_scene: false,
            resource_name: '',
            device: -1,
            window_id: 0,
            alt_pressed: false,
            shift_pressed: false,
            ctrl_pressed: false,
            meta_pressed: false,
            pressed: false,
            keycode: 0,
            physical_keycode: keyCode,
            key_label: 0,
            unicode: 0,
            location: 0,
            echo: false,
            script: null,
          })
          break
        }
        case 'mouse': {
          const mouseCode = resolveMouseCode(eventValue)
          eventObj = serializeGodotObject('InputEventMouseButton', {
            resource_local_to_scene: false,
            resource_name: '',
            device: -1,
            window_id: 0,
            alt_pressed: false,
            shift_pressed: false,
            ctrl_pressed: false,
            meta_pressed: false,
            button_mask: 0,
            position: { x: 0, y: 0 },
            global_position: { x: 0, y: 0 },
            factor: 1.0,
            button_index: mouseCode,
            canceled: false,
            pressed: true,
            double_click: false,
            script: null,
          })
          break
        }
        case 'joypad':
          eventObj = serializeGodotObject('InputEventJoypadButton', {
            resource_local_to_scene: false,
            resource_name: '',
            device: -1,
            button_index: Number.parseInt(eventValue, 10),
            pressure: 0.0,
            pressed: true,
            script: null,
          })
          break
        default:
          throw new GodotMCPError(
            `Unknown event_type: ${eventType}`,
            'INVALID_ARGS',
            'Valid types: key, mouse, joypad.',
          )
      }

      // Find existing events array and append
      const actionRegex = new RegExp(`(${escapeRegExp(actionName)}=\\{[^}]*"events":\\s*\\[)([^\\]]*)\\]`)
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

      await writeFile(configPath, updated, 'utf-8')
      return formatSuccess(`Added ${eventType} event to action: ${actionName}`)
    }

    default:
      throwUnknownAction(action, ['list', 'add_action', 'remove_action', 'add_event'])
  }
}
