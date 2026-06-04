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
const KEY_MAP: Record<string, number> = {
  KEY_SPACE: 32,
  KEY_ENTER: 4194309,
  KEY_ESCAPE: 4194305,
  KEY_TAB: 4194306,
  KEY_BACKSPACE: 4194308,
  KEY_INSERT: 4194310,
  KEY_DELETE: 4194311,
  KEY_LEFT: 4194319,
  KEY_UP: 4194320,
  KEY_RIGHT: 4194321,
  KEY_DOWN: 4194322,
  KEY_PAGEUP: 4194323,
  KEY_PAGEDOWN: 4194324,
  KEY_HOME: 4194325,
  KEY_END: 4194326,
  KEY_F1: 4194328,
  KEY_F2: 4194329,
  KEY_F3: 4194330,
  KEY_F4: 4194331,
  KEY_F5: 4194332,
  KEY_F6: 4194333,
  KEY_F7: 4194334,
  KEY_F8: 4194335,
  KEY_F9: 4194336,
  KEY_F10: 4194337,
  KEY_F11: 4194338,
  KEY_F12: 4194339,
}

const MOUSE_MAP: Record<string, number> = {
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

function resolveKeyCode(key: string): number {
  if (key.startsWith('KEY_')) {
    const val = KEY_MAP[key]
    if (val !== undefined) return val
    if (key.length === 5) return key.charCodeAt(4) // KEY_A etc
  }
  const num = Number.parseInt(key, 10)
  if (!Number.isNaN(num)) return num
  throw new GodotMCPError(`Unknown key: ${key}`, 'INVALID_ARGS', 'Use KEY_SPACE or numeric code.')
}

function resolveMouseCode(button: string): number {
  if (button.startsWith('MOUSE_BUTTON_')) {
    const val = MOUSE_MAP[button]
    if (val !== undefined) return val
  }
  const num = Number.parseInt(button, 10)
  if (!Number.isNaN(num)) return num
  throw new GodotMCPError(`Unknown mouse button: ${button}`, 'INVALID_ARGS', 'Use MOUSE_BUTTON_LEFT or numeric code.')
}

function parseEventsList(raw: string): string[] {
  // Very basic parser for the events list string
  // Format: [InputEventKey(...), InputEventMouseButton(...)]
  const events: string[] = []
  let depth = 0
  let current = ''

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i]
    if (char === '(') depth++
    if (char === ')') depth--

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
          const match = trimmed.match(/^([a-zA-Z0-9_-]+)=\{(.+)\}$/)
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
            const startMatch = trimmed.match(/^([a-zA-Z0-9_-]+)=\{(.*)$/)
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
 * Internal utility to transform input map content line by line with action tracking
 */
function transformInputMap(
  content: string,
  actionName: string,
  callbacks: {
    processActionLine: (line: string, isStart: boolean, isEnd: boolean) => string | string[] | null
  },
): { content: string; actionFound: boolean } {
  const result: string[] = []
  let inInputSection = false
  let inTargetAction = false
  let actionFound = false

  let pos = 0
  const len = content.length

  while (pos < len) {
    let nextNewline = content.indexOf('\n', pos)
    if (nextNewline === -1) nextNewline = len

    const line = content.slice(pos, nextNewline)
    const trimmed = line.trim()

    if (trimmed === '[input]') {
      inInputSection = true
      result.push(line)
    } else if (trimmed.startsWith('[') && inInputSection) {
      inInputSection = false
      result.push(line)
    } else if (inInputSection) {
      if (!inTargetAction) {
        // Check for start of target action
        if (trimmed.startsWith(`${actionName}={`)) {
          inTargetAction = true
          actionFound = true
          const isEnd = trimmed.endsWith('}')
          const processed = callbacks.processActionLine(line, true, isEnd)
          if (processed !== null) {
            if (Array.isArray(processed)) result.push(...processed)
            else result.push(processed)
          }
          if (isEnd) inTargetAction = false
        } else {
          result.push(line)
        }
      } else {
        // We are in the target action (multi-line)
        const isEnd = trimmed.endsWith('}')
        const processed = callbacks.processActionLine(line, false, isEnd)
        if (processed !== null) {
          if (Array.isArray(processed)) result.push(...processed)
          else result.push(processed)
        }
        if (isEnd) inTargetAction = false
      }
    } else {
      result.push(line)
    }

    pos = nextNewline + 1
  }

  return { content: result.join('\n'), actionFound }
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

      // ⚡ Bolt: Use transformInputMap to safely remove action without ReDoS-prone RegExp
      const { content: updated, actionFound } = transformInputMap(content, actionName, {
        processActionLine: () => null, // Skip all lines of the action
      })

      if (!actionFound) {
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

      // ⚡ Bolt: Use transformInputMap to safely append event without ReDoS-prone RegExp
      const { content: updated, actionFound } = transformInputMap(content, actionName, {
        processActionLine: (line) => {
          const trimmed = line.trim()
          if (trimmed.includes('"events":')) {
            const bracketIdx = line.lastIndexOf(']')
            if (bracketIdx !== -1) {
              const beforeBracket = line.slice(0, bracketIdx)
              const afterBracket = line.slice(bracketIdx)
              const isEmpty = beforeBracket.trimEnd().endsWith('[')
              return `${beforeBracket}${isEmpty ? '' : ', '}${eventObj}${afterBracket}`
            }
          }
          return line
        },
      })

      if (!actionFound) {
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
