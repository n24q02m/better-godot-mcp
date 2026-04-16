/**
 * Physics tool - Physics layers and collision configuration
 * Actions: layers | collision_setup | body_config | set_layer_name
 */

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
import { toGodotValue } from '../helpers/godot-types.js'
import { pathExists, safeResolve } from '../helpers/paths.js'
import { parseProjectSettingsAsync, setSettingInContent } from '../helpers/project-settings.js'
import { escapeRegExp } from '../helpers/scene-parser.js'

export async function handlePhysics(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const projectPath = (args.project_path as string) || config.projectPath || ''

  switch (action) {
    case 'layers': {
      if (!projectPath) throw new GodotMCPError('No project path specified', 'INVALID_ARGS', 'Provide project_path.')
      const configPath = join(safeResolve(config.projectPath || process.cwd(), projectPath), 'project.godot')
      if (!(await pathExists(configPath)))
        throw new GodotMCPError('No project.godot found', 'PROJECT_NOT_FOUND', 'Verify project path.')

      const settings = await parseProjectSettingsAsync(configPath)
      const layers2d: Record<string, string> = {}
      const layers3d: Record<string, string> = {}

      for (const [key, value] of settings.sections.get('layer_names') || []) {
        if (key.startsWith('2d_physics/layer_')) {
          layers2d[key] = value.replace(/"/g, '')
        } else if (key.startsWith('3d_physics/layer_')) {
          layers3d[key] = value.replace(/"/g, '')
        }
      }

      return formatJSON({ layers2d, layers3d })
    }

    case 'collision_setup': {
      const scenePath = args.scene_path as string
      if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
      const nodeName = args.name as string
      if (!nodeName) throw new GodotMCPError('No node name specified', 'INVALID_ARGS', 'Provide node name.')

      if (scenePath.includes('\n') || scenePath.includes('\r') || nodeName.includes('\n') || nodeName.includes('\r')) {
        throw new GodotMCPError('Invalid arguments: newlines not allowed', 'INVALID_ARGS')
      }

      const collisionLayer = args.collision_layer
      const collisionMask = args.collision_mask

      const fullPath = safeResolve(safeResolve(config.projectPath || process.cwd(), projectPath), scenePath)
      if (!(await pathExists(fullPath)))
        throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check file path.')

      let content = await readFile(fullPath, 'utf-8')
      const nodeRegex = new RegExp(`(\\[node name="${escapeRegExp(nodeName)}"[^\\]]*\\])`)
      const match = content.match(nodeRegex)
      if (!match) throw new GodotMCPError(`Node "${nodeName}" not found`, 'NODE_ERROR', 'Check node name.')

      if (match.index === undefined)
        throw new GodotMCPError(`Node "${nodeName}" not found`, 'NODE_ERROR', 'Check node name.')
      const insertPoint = match.index + match[0].length
      let props = ''
      if (collisionLayer !== undefined) {
        const val = toGodotValue(collisionLayer)
        if (val.includes('\n') || val.includes('\r')) {
          throw new GodotMCPError('Invalid collision_layer: newlines not allowed', 'INVALID_ARGS')
        }
        props += `\ncollision_layer = ${val}`
      }
      if (collisionMask !== undefined) {
        const val = toGodotValue(collisionMask)
        if (val.includes('\n') || val.includes('\r')) {
          throw new GodotMCPError('Invalid collision_mask: newlines not allowed', 'INVALID_ARGS')
        }
        props += `\ncollision_mask = ${val}`
      }

      content = `${content.slice(0, insertPoint)}${props}${content.slice(insertPoint)}`
      await writeFile(fullPath, content, 'utf-8')

      return formatSuccess(
        `Set collision on ${nodeName}: layer=${collisionLayer ?? 'unchanged'}, mask=${collisionMask ?? 'unchanged'}`,
      )
    }

    case 'body_config': {
      const scenePath = args.scene_path as string
      if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
      const nodeName = args.name as string
      if (!nodeName) throw new GodotMCPError('No node name specified', 'INVALID_ARGS', 'Provide node name.')

      if (scenePath.includes('\n') || scenePath.includes('\r') || nodeName.includes('\n') || nodeName.includes('\r')) {
        throw new GodotMCPError('Invalid arguments: newlines not allowed', 'INVALID_ARGS')
      }

      const fullPath = safeResolve(safeResolve(config.projectPath || process.cwd(), projectPath), scenePath)
      if (!(await pathExists(fullPath)))
        throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check file path.')

      let content = await readFile(fullPath, 'utf-8')
      const nodeRegex = new RegExp(`(\\[node name="${escapeRegExp(nodeName)}"[^\\]]*\\])`)
      const match = content.match(nodeRegex)
      if (!match) throw new GodotMCPError(`Node "${nodeName}" not found`, 'NODE_ERROR', 'Check node name.')

      let props = ''
      const physicsProps = ['gravity_scale', 'mass', 'linear_damp', 'angular_damp', 'freeze']
      for (const prop of physicsProps) {
        if (args[prop] !== undefined) {
          const val = toGodotValue(args[prop])
          if (val.includes('\n') || val.includes('\r')) {
            throw new GodotMCPError(`Invalid ${prop}: newlines not allowed`, 'INVALID_ARGS')
          }
          props += `\n${prop} = ${val}`
        }
      }

      if (match.index === undefined)
        throw new GodotMCPError(`Node "${nodeName}" not found`, 'NODE_ERROR', 'Check node name.')
      const insertPoint = match.index + match[0].length
      content = `${content.slice(0, insertPoint)}${props}${content.slice(insertPoint)}`
      await writeFile(fullPath, content, 'utf-8')

      return formatSuccess(`Configured physics body: ${nodeName}`)
    }

    case 'set_layer_name': {
      if (!projectPath) throw new GodotMCPError('No project path specified', 'INVALID_ARGS', 'Provide project_path.')
      const layerNumRaw = args.layer_number !== undefined ? String(args.layer_number) : '1'
      const dimension = (args.dimension as string) || '2d'
      const name = args.name as string
      if (!name) throw new GodotMCPError('No name specified', 'INVALID_ARGS', 'Provide layer name.')

      if (
        name.includes('\n') ||
        name.includes('\r') ||
        dimension.includes('\n') ||
        dimension.includes('\r') ||
        layerNumRaw.includes('\n') ||
        layerNumRaw.includes('\r')
      ) {
        throw new GodotMCPError('Invalid arguments: newlines not allowed', 'INVALID_ARGS')
      }

      const layerNum = Number.parseInt(layerNumRaw, 10)
      if (Number.isNaN(layerNum)) {
        throw new GodotMCPError('Invalid layer_number: must be a number', 'INVALID_ARGS')
      }

      const configPath = join(safeResolve(config.projectPath || process.cwd(), projectPath), 'project.godot')
      if (!(await pathExists(configPath)))
        throw new GodotMCPError('No project.godot found', 'PROJECT_NOT_FOUND', 'Verify project path.')

      const content = await readFile(configPath, 'utf-8')
      const key = `layer_names/${dimension}_physics/layer_${layerNum}`
      const updated = setSettingInContent(content, key, `"${name}"`)
      await writeFile(configPath, updated, 'utf-8')

      return formatSuccess(`Set ${dimension} physics layer ${layerNum}: "${name}"`)
    }

    default:
      throwUnknownAction(action, ['layers', 'collision_setup', 'body_config', 'set_layer_name'])
  }
}
