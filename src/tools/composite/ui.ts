/**
 * UI tool - Control node and theme management
 * Actions: create_control | set_theme | layout | list_controls
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError } from '../helpers/errors.js'
import { safeResolve } from '../helpers/paths.js'

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

function resolveScene(projectPath: string | null | undefined, scenePath: string): string {
  const base = projectPath || process.cwd()
  const fullPath = safeResolve(base, scenePath)
  if (!existsSync(fullPath))
    throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')
  return fullPath
}

export async function handleUI(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const projectPath = (args.project_path as string) || config.projectPath

  switch (action) {
    case 'create_control': {
      const scenePath = args.scene_path as string
      if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
      const controlName = args.name as string
      const controlType = (args.type as string) || 'Control'
      const parent = (args.parent as string) || '.'

      if (!controlName) throw new GodotMCPError('No name specified', 'INVALID_ARGS', 'Provide control node name.')

      const fullPath = resolveScene(projectPath, scenePath)
      let content = readFileSync(fullPath, 'utf-8')

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
      const props = args.properties as Record<string, string> | undefined
      if (props) {
        for (const [key, value] of Object.entries(props)) {
          nodeDecl += `${key} = ${value}\n`
        }
      }

      content = `${content.trimEnd()}\n${nodeDecl}`
      writeFileSync(fullPath, content, 'utf-8')

      return formatSuccess(`Created UI control: ${controlName} (${controlType}) under ${parent}`)
    }

    case 'set_theme': {
      const themePath = args.theme_path as string
      if (!themePath)
        throw new GodotMCPError(
          'No theme_path specified',
          'INVALID_ARGS',
          'Provide theme_path (e.g., "themes/main.tres").',
        )

      const base = projectPath || process.cwd()
      const fullPath = safeResolve(base, themePath)

      const fontSize = (args.font_size as number) || 16
      const _fontColor = (args.font_color as string) || 'Color(1, 1, 1, 1)'
      const _bgColor = (args.bg_color as string) || 'Color(0.15, 0.15, 0.15, 1)'

      const content = [
        '[gd_resource type="Theme" format=3]',
        '',
        '[resource]',
        `default_font_size = ${fontSize}`,
        '',
      ].join('\n')

      mkdirSync(dirname(fullPath), { recursive: true })
      writeFileSync(fullPath, content, 'utf-8')

      return formatSuccess(`Created theme: ${themePath} (font size: ${fontSize})`)
    }

    case 'layout': {
      const scenePath = args.scene_path as string
      if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
      const nodeName = args.name as string
      if (!nodeName) throw new GodotMCPError('No name specified', 'INVALID_ARGS', 'Provide node name.')
      const preset = (args.preset as string) || 'full_rect'

      const fullPath = resolveScene(projectPath, scenePath)
      let content = readFileSync(fullPath, 'utf-8')

      const nodeRegex = new RegExp(`(\\[node name="${nodeName}"[^\\]]*\\])`)
      const match = content.match(nodeRegex)
      if (!match) throw new GodotMCPError(`Node "${nodeName}" not found`, 'NODE_ERROR', 'Check node name.')

      let layoutProps = ''
      switch (preset) {
        case 'full_rect':
          layoutProps =
            '\nanchors_preset = 15\nanchor_right = 1.0\nanchor_bottom = 1.0\ngrow_horizontal = 2\ngrow_vertical = 2'
          break
        case 'center':
          layoutProps =
            '\nanchors_preset = 8\nanchor_left = 0.5\nanchor_top = 0.5\nanchor_right = 0.5\nanchor_bottom = 0.5\ngrow_horizontal = 2\ngrow_vertical = 2'
          break
        case 'top_wide':
          layoutProps = '\nanchors_preset = 10\nanchor_right = 1.0\ngrow_horizontal = 2'
          break
        case 'bottom_wide':
          layoutProps =
            '\nanchors_preset = 12\nanchor_top = 1.0\nanchor_right = 1.0\nanchor_bottom = 1.0\ngrow_horizontal = 2\ngrow_vertical = 0'
          break
        case 'left_wide':
          layoutProps = '\nanchors_preset = 9\nanchor_bottom = 1.0\ngrow_vertical = 2'
          break
        case 'right_wide':
          layoutProps =
            '\nanchors_preset = 11\nanchor_left = 1.0\nanchor_right = 1.0\nanchor_bottom = 1.0\ngrow_horizontal = 0\ngrow_vertical = 2'
          break
        default:
          throw new GodotMCPError(
            `Unknown layout preset: ${preset}`,
            'INVALID_ARGS',
            'Valid presets: full_rect, center, top_wide, bottom_wide, left_wide, right_wide.',
          )
      }

      if (match.index === undefined)
        throw new GodotMCPError(`Node "${nodeName}" not found`, 'NODE_ERROR', 'Check node name.')
      const insertPoint = match.index + match[0].length
      content = `${content.slice(0, insertPoint)}${layoutProps}${content.slice(insertPoint)}`
      writeFileSync(fullPath, content, 'utf-8')

      return formatSuccess(`Set layout preset "${preset}" on ${nodeName}`)
    }

    case 'list_controls': {
      const scenePath = args.scene_path as string
      if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')

      const fullPath = resolveScene(projectPath, scenePath)
      const content = readFileSync(fullPath, 'utf-8')

      const controlTypes = new Set([
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

      const controls: { name: string; type: string; parent: string }[] = []
      const nodeRegex = /\[node name="([^"]+)" type="([^"]+)"(?:\s+parent="([^"]*)")?/g
      for (const match of content.matchAll(nodeRegex)) {
        if (controlTypes.has(match[2])) {
          controls.push({ name: match[1], type: match[2], parent: match[3] || '(root)' })
        }
      }

      return formatJSON({ scene: scenePath, count: controls.length, controls })
    }

    default:
      throw new GodotMCPError(
        `Unknown action: ${action}`,
        'INVALID_ACTION',
        'Valid actions: create_control, set_theme, layout, list_controls. Use help tool for full docs.',
      )
  }
}
