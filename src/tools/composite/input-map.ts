import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError } from '../helpers/errors.js'
import {
  getInputActions,
  getSetting,
  parseProjectSettingsContent,
  removeSettingInContent,
  setSettingInContent,
} from '../helpers/project-settings.js'

/**
 * Godot 4.x KeyCode enum numeric values (partial list)
 */
const GODOT_KEY_CODES: Record<string, number> = {
  // Letters
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

function getProjectGodotPath(projectPath: string | null | undefined): string {
  if (!projectPath) throw new GodotMCPError('No project path specified', 'INVALID_ARGS', 'Provide project_path.')
  const configPath = join(resolve(projectPath), 'project.godot')
  if (!existsSync(configPath))
    throw new GodotMCPError('No project.godot found', 'PROJECT_NOT_FOUND', 'Verify the project path.')
  return configPath
}

/**
 * Extract event strings from a Godot input action value string
 */
function extractEventsFromValue(value: string): string[] {
  const eventsMatch = value.match(/"events":\s*\[([^\]]*)\]/)
  return eventsMatch
    ? eventsMatch[1]
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean)
    : []
}

export async function handleInputMap(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const projectPath = (args.project_path as string) || config.projectPath

  switch (action) {
    case 'list': {
      const configPath = getProjectGodotPath(projectPath)
      const content = readFileSync(configPath, 'utf-8')
      const settings = parseProjectSettingsContent(content)
      const actionsMap = getInputActions(settings)

      const actionList = Array.from(actionsMap.entries()).map(([name, value]) => ({
        name,
        eventCount: extractEventsFromValue(value).length,
      }))

      return formatJSON({ count: actionList.length, actions: actionList })
    }

    case 'add_action': {
      const configPath = getProjectGodotPath(projectPath)
      const actionName = args.action_name as string
      if (!actionName) throw new GodotMCPError('No action_name specified', 'INVALID_ARGS', 'Provide action_name.')
      const deadzone = (args.deadzone as number) || 0.5

      const content = readFileSync(configPath, 'utf-8')
      const settings = parseProjectSettingsContent(content)

      // Check if action already exists
      if (getSetting(settings, `input/${actionName}`)) {
        throw new GodotMCPError(`Action "${actionName}" already exists`, 'INPUT_ERROR', 'Remove it first to recreate.')
      }

      const actionValue = `{\n"deadzone": ${deadzone},\n"events": []\n}`
      const updated = setSettingInContent(content, `input/${actionName}`, actionValue)

      writeFileSync(configPath, updated, 'utf-8')
      return formatSuccess(`Added input action: ${actionName} (deadzone: ${deadzone})`)
    }

    case 'remove_action': {
      const configPath = getProjectGodotPath(projectPath)
      const actionName = args.action_name as string
      if (!actionName) throw new GodotMCPError('No action_name specified', 'INVALID_ARGS', 'Provide action_name.')

      const content = readFileSync(configPath, 'utf-8')
      const settings = parseProjectSettingsContent(content)

      if (!getSetting(settings, `input/${actionName}`)) {
        throw new GodotMCPError(`Action "${actionName}" not found`, 'INPUT_ERROR', 'Check action name with list.')
      }

      const updated = removeSettingInContent(content, `input/${actionName}`)
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
      const settings = parseProjectSettingsContent(content)
      const currentValue = getSetting(settings, `input/${actionName}`)

      if (!currentValue) {
        throw new GodotMCPError(
          `Action "${actionName}" not found`,
          'INPUT_ERROR',
          'Add the action first with add_action.',
        )
      }

      // Build event object based on type
      let eventObj: string
      switch (eventType) {
        case 'key': {
          const keyCode = resolveKeyCode(eventValue)
          eventObj = `Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":${keyCode},"key_label":0,"unicode":0,"location":0,"echo":false,"script":null)`
          break
        }
        case 'mouse': {
          const mouseCode = resolveMouseCode(eventValue)
          eventObj = `Object(InputEventMouseButton,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"button_mask":0,"position":Vector2(0,0),"global_position":Vector2(0,0),"factor":1.0,"button_index":${mouseCode},"canceled":false,"pressed":true,"double_click":false,"script":null)`
          break
        }
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
      const eventsMatch = currentValue.match(/"events":\s*\[([^\]]*)\]/)
      if (!eventsMatch) {
        // Should usually not happen for valid action
        throw new GodotMCPError(`Action "${actionName}" has invalid format`, 'INPUT_ERROR', 'Events array not found.')
      }

      const existingEvents = eventsMatch[1].trim()
      const newEvents = existingEvents ? `${existingEvents}, ${eventObj}` : eventObj
      const updatedValue = currentValue.replace(/"events":\s*\[[^\]]*\]/, `"events": [${newEvents}]`)

      const updated = setSettingInContent(content, `input/${actionName}`, updatedValue)
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
