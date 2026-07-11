/**
 * UI tool - Control node and theme management
 * Actions: create_control | set_theme | layout | list_controls
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
import { resolveProjectRoot, safeResolve } from '../helpers/paths.js'
import { parseScene, updateNodeInScene } from '../helpers/scene-parser.js'

const CONTROL_TEMPLATES: Record<string, Record<string, string>> = {
  Button: { text: '"Click"' },
  Label: { text: '"Label"' },
  LineEdit: { placeholder_text: '"Enter text..."' },
  TextEdit: {},
  ProgressBar: { value: '50.0', max_value: '100.0' },
  HSlider: { value: '0.0', max_value: '100.0' },
  CheckBox: { text: '"Check"' },
  OptionButton: {},
  SpinBox: { value: '0.0', max_value: '100.0' },
  ColorPickerButton: {},
  TextureRect: {},
  Panel: {},
  TabContainer: {},
  ScrollContainer: {},
  MarginContainer: {},
  HBoxContainer: {},
  VBoxContainer: {},
  GridContainer: { columns: '2' },
}

const CONTROL_TYPES = new Set([
  'Control',
  'Button',
  'Label',
  'LineEdit',
  'TextEdit',
  'RichTextLabel',
  'ProgressBar',
  'HSlider',
  'VSlider',
  'CheckBox',
  'CheckButton',
  'OptionButton',
  'SpinBox',
  'ColorPickerButton',
  'TextureRect',
  'TextureButton',
  'Panel',
  'PanelContainer',
  'TabContainer',
  'ScrollContainer',
  'MarginContainer',
  'HBoxContainer',
  'VBoxContainer',
  'GridContainer',
  'CenterContainer',
  'AspectRatioContainer',
  'SubViewportContainer',
  'ItemList',
  'Tree',
  'GraphEdit',
  'ColorRect',
  'NinePatchRect',
])

// ⚡ Bolt: Removed redundant pathExists. Instead return resolved path and use try/catch in handlers where needed.
function resolveScene(projectRoot: string, scenePath: string): string {
  return safeResolve(projectRoot, scenePath)
}

async function handleCreateControl(projectPath: string, args: Record<string, unknown>) {
  const scenePath = args.scene_path as string
  if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
  const controlName = args.name as string
  const controlType = (args.type as string) || 'Control'
  const parent = (args.parent as string) || '.'

  if (!controlName) throw new GodotMCPError('No name specified', 'INVALID_ARGS', 'Provide control node name.')

  if (
    controlName.includes('"') ||
    controlName.includes('\n') ||
    controlName.includes('\r') ||
    controlType.includes('"') ||
    controlType.includes('\n') ||
    controlType.includes('\r') ||
    parent.includes('"') ||
    parent.includes('\n') ||
    parent.includes('\r')
  ) {
    throw new GodotMCPError(
      'Invalid characters in parameters',
      'INVALID_ARGS',
      'Parameters must not contain quotes or newlines.',
    )
  }

  const fullPath = resolveScene(projectPath, scenePath)
  let content: string
  try {
    // ⚡ Bolt: Using try-to-perform instead of pathExists to reduce redundant I/O calls
    content = await readFile(fullPath, 'utf-8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')
    }
    throw err
  }

  const parentAttr = parent === '.' ? '' : ` parent="${parent}"`
  let nodeDecl = `\n[node name="${controlName}" type="${controlType}"${parentAttr}]\n`

  // Add default properties for known control types
  const defaults = CONTROL_TEMPLATES[controlType]
  if (defaults) {
    for (const [key, value] of Object.entries(defaults)) {
      nodeDecl += `${key} = ${value}\n`
    }
  }

  // Add custom properties
  if (args.properties !== undefined) {
    if (typeof args.properties !== 'object' || args.properties === null || Array.isArray(args.properties)) {
      throw new GodotMCPError(
        'Invalid properties format',
        'INVALID_ARGS',
        'properties must be an object with string keys and values.',
      )
    }
    for (const [key, value] of Object.entries(args.properties)) {
      if (typeof key !== 'string' || typeof value !== 'string') {
        throw new GodotMCPError('Invalid property value', 'INVALID_ARGS', 'Property keys and values must be strings.')
      }
      if (key.includes('=') || key.includes('\n') || key.includes('\r')) {
        throw new GodotMCPError('Invalid property key', 'INVALID_ARGS', 'Property keys must not contain "=", newlines.')
      }
      if (value.includes('\n') || value.includes('\r')) {
        throw new GodotMCPError('Invalid property value', 'INVALID_ARGS', 'Property values must not contain newlines.')
      }
      nodeDecl += `${key} = ${value}\n`
    }
  }

  content = `${content.trimEnd()}\n${nodeDecl}`
  await writeFile(fullPath, content, 'utf-8')

  return formatSuccess(`Created UI control: ${controlName} (${controlType}) under ${parent}`)
}

async function handleSetTheme(projectPath: string, args: Record<string, unknown>) {
  const themePath = args.theme_path as string
  if (!themePath)
    throw new GodotMCPError('No theme_path specified', 'INVALID_ARGS', 'Provide theme_path (e.g., "themes/main.tres").')

  if (args.font_size !== undefined && typeof args.font_size !== 'number') {
    throw new GodotMCPError('font_size must be a number', 'INVALID_ARGS')
  }

  const fullPath = safeResolve(projectPath || process.cwd(), themePath)

  const fontSize = (args.font_size as number) || 16

  const content = ['[gd_resource type="Theme" format=3]', '', '[resource]', `default_font_size = ${fontSize}`, ''].join(
    '\n',
  )

  await mkdir(dirname(fullPath), { recursive: true })
  await writeFile(fullPath, content, 'utf-8')

  return formatSuccess(`Created theme: ${themePath} (font size: ${fontSize})`)
}

async function handleLayout(projectPath: string, args: Record<string, unknown>) {
  const scenePath = args.scene_path as string
  if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
  const nodeName = args.name as string
  if (!nodeName) throw new GodotMCPError('No name specified', 'INVALID_ARGS', 'Provide node name.')
  const preset = (args.preset as string) || 'full_rect'

  if (
    nodeName.includes('"') ||
    nodeName.includes('\n') ||
    nodeName.includes('\r') ||
    preset.includes('"') ||
    preset.includes('\n') ||
    preset.includes('\r')
  ) {
    throw new GodotMCPError(
      'Invalid characters in parameters',
      'INVALID_ARGS',
      'Parameters must not contain quotes or newlines.',
    )
  }

  const fullPath = resolveScene(projectPath, scenePath)
  let content: string
  try {
    // ⚡ Bolt: Using try-to-perform instead of pathExists to reduce redundant I/O calls
    content = await readFile(fullPath, 'utf-8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')
    }
    throw err
  }

  let updates: Record<string, string> = {}
  switch (preset) {
    case 'full_rect':
      updates = {
        anchors_preset: '15',
        anchor_right: '1.0',
        anchor_bottom: '1.0',
        grow_horizontal: '2',
        grow_vertical: '2',
      }
      break
    case 'center':
      updates = {
        anchors_preset: '8',
        anchor_left: '0.5',
        anchor_top: '0.5',
        anchor_right: '0.5',
        anchor_bottom: '0.5',
        grow_horizontal: '2',
        grow_vertical: '2',
      }
      break
    case 'top_wide':
      updates = { anchors_preset: '10', anchor_right: '1.0', grow_horizontal: '2' }
      break
    case 'bottom_wide':
      updates = {
        anchors_preset: '12',
        anchor_top: '1.0',
        anchor_right: '1.0',
        anchor_bottom: '1.0',
        grow_horizontal: '2',
        grow_vertical: '0',
      }
      break
    case 'left_wide':
      updates = { anchors_preset: '9', anchor_bottom: '1.0', grow_vertical: '2' }
      break
    case 'right_wide':
      updates = {
        anchors_preset: '11',
        anchor_left: '1.0',
        anchor_right: '1.0',
        anchor_bottom: '1.0',
        grow_horizontal: '0',
        grow_vertical: '2',
      }
      break
    default:
      throw new GodotMCPError(
        `Unknown layout preset: ${preset}`,
        'INVALID_ARGS',
        'Valid presets: full_rect, center, top_wide, bottom_wide, left_wide, right_wide.',
      )
  }

  const { content: updatedContent, updated } = updateNodeInScene(content, nodeName, updates)
  if (!updated) throw new GodotMCPError(`Node "${nodeName}" not found`, 'NODE_ERROR', 'Check node name.')

  await writeFile(fullPath, updatedContent, 'utf-8')

  return formatSuccess(`Set layout preset "${preset}" on ${nodeName}`)
}

async function handleListControls(projectPath: string, args: Record<string, unknown>) {
  const scenePath = args.scene_path as string
  if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')

  const fullPath = resolveScene(projectPath, scenePath)
  let scene: Awaited<ReturnType<typeof parseScene>>
  try {
    // ⚡ Bolt: Using try-to-perform instead of pathExists to reduce redundant I/O calls
    scene = await parseScene(fullPath)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')
    }
    throw err
  }

  const controls: { name: string; type: string; parent: string }[] = []

  // ⚡ Bolt: Query by pre-indexed types (O(K)) instead of iterating all N nodes.
  // This drastically speeds up filtering in complex scenes with many non-Control nodes.
  for (const type of CONTROL_TYPES) {
    const typeNodes = scene.nodesByType.get(type)
    if (typeNodes) {
      for (let i = 0; i < typeNodes.length; i++) {
        const node = typeNodes[i]
        controls.push({ name: node.name, type: node.type || type, parent: node.parent || '(root)' })
      }
    }
  }

  return formatJSON({ scene: scenePath, count: controls.length, controls })
}

export async function handleUI(action: string, args: Record<string, unknown>, config: GodotConfig) {
  // project_path is caller-controlled and untrusted; confine it to the trusted
  // project root before any handler uses it as a file-resolution base.
  const projectPath = resolveProjectRoot(args.project_path, config.projectPath)

  switch (action) {
    case 'create_control':
      return handleCreateControl(projectPath, args)
    case 'set_theme':
      return handleSetTheme(projectPath, args)
    case 'layout':
      return handleLayout(projectPath, args)
    case 'list_controls':
      return handleListControls(projectPath, args)
    default:
      throwUnknownAction(action, ['create_control', 'set_theme', 'layout', 'list_controls'])
  }
}
