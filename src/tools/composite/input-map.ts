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

/**
 * Godot 4.x Key enum numeric values (@GlobalScope.Key)
 * Letters are ASCII codes, special keys use the 4194304+ range (2^22 bit set)
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
  // Special Keys
  KEY_ENTER: 4194309,
  KEY_ESCAPE: 4194305,
  KEY_TAB: 4194306,
  KEY_BACKSPACE: 4194308,
  KEY_INSERT: 4194311,
  KEY_DELETE: 4194312,
  KEY_PAUSE: 4194313,
  KEY_PRINT: 4194314,
  KEY_SYSREQ: 4194315,
  KEY_CLEAR: 4194316,
  KEY_HOME: 4194317,
  KEY_END: 4194318,
  KEY_LEFT: 4194319,
  KEY_UP: 4194320,
  KEY_RIGHT: 4194321,
  KEY_DOWN: 4194322,
  KEY_PAGEUP: 4194323,
  KEY_PAGEDOWN: 4194324,
  KEY_SHIFT: 4194325,
  KEY_CTRL: 4194326,
  KEY_META: 4194327,
  KEY_ALT: 4194328,
  KEY_CAPSLOCK: 4194329,
  KEY_NUMLOCK: 4194330,
  KEY_SCROLLLOCK: 4194331,
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
  KEY_SPACE: 32,
}

const GODOT_MOUSE_BUTTONS: Record<string, number> = {
  MOUSE_BUTTON_LEFT: 1,
  MOUSE_BUTTON_RIGHT: 2,
  MOUSE_BUTTON_MIDDLE: 3,
  MOUSE_BUTTON_WHEEL_UP: 4,
  MOUSE_BUTTON_WHEEL_DOWN: 5,
  MOUSE_BUTTON_WHEEL_LEFT: 6,
  MOUSE_BUTTON_WHEEL_RIGHT: 7,
  MOUSE_BUTTON_XBUTTON1: 8,
  MOUSE_BUTTON_XBUTTON2: 9,
}

/**
 * Resolve a Godot key name or raw code to numeric value
 */
function resolveKeyCode(name: string): number {
  if (/^\d+$/.test(name)) return Number.parseInt(name, 10)
  const code = GODOT_KEY_CODES[name.toUpperCase()]
  if (code === undefined) throw new GodotMCPError(`Unknown key: ${name}`, 'INVALID_ARGS', 'Check KEY_ enum names.')
  return code
}

/**
 * Resolve a Godot mouse button name or raw code to numeric value
 */
function resolveMouseCode(name: string): number {
  if (/^\d+$/.test(name)) return Number.parseInt(name, 10)
  const code = GODOT_MOUSE_BUTTONS[name.toUpperCase()]
  if (code === undefined)
    throw new GodotMCPError(`Unknown mouse button: ${name}`, 'INVALID_ARGS', 'Check MOUSE_BUTTON_ enum names.')
  return code
}

/**
 * Robustly parse Godot's serialized events list, handling nested structures like SubResource
 */
function parseEventsList(eventsStr: string): string[] {
  const events: string[] = []
  let depth = 0
  let current = ''

  for (let i = 0; i < eventsStr.length; i++) {
    const char = eventsStr[i]

    // Track nesting depth to handle complex objects within the array
    if (char === '[' || char === '(') {
      depth++
    } else if (char === ']' || char === ')') {
      depth--
    }

    if (char === ',' && depth === 0) {
      events.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  if (current.trim()) {
    events.push(current.trim())
  }

  return events
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

/**
 * Safely transforms the [input] section of project.godot without using dynamic RegExps.
 */
function transformInputMap(
  content: string,
  targetAction: string,
  transform: (actionBlock: string) => string | null,
): string {
  const lines = content.split('\n')
  const result: string[] = []
  let inInputSection = false
  let actionFound = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed === '[input]') {
      inInputSection = true
      result.push(line)
      continue
    }

    if (inInputSection && trimmed.startsWith('[') && trimmed.endsWith(']')) {
      inInputSection = false
    }

    if (
      inInputSection &&
      !actionFound &&
      (trimmed === `${targetAction}={` || trimmed.startsWith(`${targetAction}={`))
    ) {
      // Check if it's actually the start of the action (not a substring of another action name)
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx !== -1 && trimmed.slice(0, eqIdx) === targetAction) {
        actionFound = true
        const blockLines = [line]
        if (!trimmed.endsWith('}')) {
          let j = i + 1
          while (j < lines.length) {
            const nextLine = lines[j]
            blockLines.push(nextLine)
            if (nextLine.trim().endsWith('}')) {
              i = j
              break
            }
            j++
          }
        }

        const transformed = transform(blockLines.join('\n'))
        if (transformed !== null) {
          result.push(transformed)
        }
        continue
      }
    }

    result.push(line)
  }

  return actionFound ? result.join('\n') : content
}

export async function handleInputMap(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const baseDir = config.projectPath || process.cwd()
  const projectPath = (args.project_path as string) || config.projectPath

  switch (action) {
    case 'list': {
      const configPath = await getProjectGodotPath(projectPath, baseDir)
      const content = await readFile(configPath, 'utf-8')
      const actions = parseInputActions(content)

      // ⚡ Bolt: Use a pre-allocated array and for...of loop to prevent Array.from() + .map() allocation overhead
      const actionList = new Array(actions.size)
      let idx = 0
      for (const [name, events] of actions) {
        actionList[idx++] = {
          name,
          eventCount: events.length,
        }
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
      content = content.replace('[input]', () => `[input]\n${actionLine}`)

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
      const updated = transformInputMap(content, actionName, () => null)

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

      // Find existing events array and append using transformInputMap
      const updated = transformInputMap(content, actionName, (block) => {
        const eventsIdx = block.indexOf('"events":')
        if (eventsIdx === -1) return block

        const openBracketIdx = block.indexOf('[', eventsIdx)
        if (openBracketIdx === -1) return block

        const closeBracketIdx = block.indexOf(']', openBracketIdx)
        if (closeBracketIdx === -1) return block

        const existingEvents = block.slice(openBracketIdx + 1, closeBracketIdx).trim()
        const newEvents = existingEvents ? `${existingEvents}, ${eventObj}` : eventObj

        return block.slice(0, openBracketIdx + 1) + newEvents + block.slice(closeBracketIdx)
      })

      if (updated === content) {
        throw new GodotMCPError(
          `Action "${actionName}" not found`,
          'INPUT_ERROR',
          'Add the action first with add_action.',
        )
      }

      await writeFile(configPath, updated, 'utf-8')
      return formatSuccess(`Added ${eventType} event to action: ${actionName}`)
    }

    default:
      throwUnknownAction(action, ['list', 'add_action', 'remove_action', 'add_event'])
  }
}
