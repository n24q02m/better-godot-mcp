/**
 * Physics tool - Physics layers and collision configuration
 * Actions: layers | collision_setup | body_config | set_layer_name
 */

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
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

      // Performance optimization: using async file reading instead of sync
      // to avoid blocking the Node.js event loop during I/O operations
      const settings = await parseProjectSettingsAsync(configPath)
      const layers2d: Record<string, string> = {}
      const layers3d: Record<string, string> = {}

      // Read layer names from layer_names section
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
      const collisionLayer = args.collision_layer as number
      const collisionMask = args.collision_mask as number

      const fullPath = safeResolve(safeResolve(config.projectPath || process.cwd(), projectPath), scenePath)
      if (!(await pathExists(fullPath)))
        throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check file path.')

      let content = await readFile(fullPath, 'utf-8')
      const nodeRegex = new RegExp(`(\\[node name="${escapeRegExp(nodeName)}"[^\\]]*\\])`)
      const match = content.match(nodeRegex)
      if (!match) throw new GodotMCPError(`Node "${nodeName}" not found`, 'NODE_ERROR', 'Check node name.')

      // Find or create properties after node declaration
      if (match.index === undefined)
        throw new GodotMCPError(`Node "${nodeName}" not found`, 'NODE_ERROR', 'Check node name.')
      const insertPoint = match.index + match[0].length
      let props = ''
      if (collisionLayer !== undefined) props += `\ncollision_layer = ${collisionLayer}`
      if (collisionMask !== undefined) props += `\ncollision_mask = ${collisionMask}`

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

      const fullPath = safeResolve(safeResolve(config.projectPath || process.cwd(), projectPath), scenePath)
      if (!(await pathExists(fullPath)))
        throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check file path.')

      let content = await readFile(fullPath, 'utf-8')
      const nodeRegex = new RegExp(`(\\[node name="${escapeRegExp(nodeName)}"[^\\]]*\\])`)
      const match = content.match(nodeRegex)
      if (!match) throw new GodotMCPError(`Node "${nodeName}" not found`, 'NODE_ERROR', 'Check node name.')

      let props = ''
      if (args.gravity_scale !== undefined) props += `\ngravity_scale = ${args.gravity_scale}`
      if (args.mass !== undefined) props += `\nmass = ${args.mass}`
      if (args.linear_damp !== undefined) props += `\nlinear_damp = ${args.linear_damp}`
      if (args.angular_damp !== undefined) props += `\nangular_damp = ${args.angular_damp}`
      if (args.freeze !== undefined) props += `\nfreeze = ${args.freeze}`

      if (match.index === undefined)
        throw new GodotMCPError(`Node "${nodeName}" not found`, 'NODE_ERROR', 'Check node name.')
      const insertPoint = match.index + match[0].length
      content = `${content.slice(0, insertPoint)}${props}${content.slice(insertPoint)}`
      await writeFile(fullPath, content, 'utf-8')

      return formatSuccess(`Configured physics body: ${nodeName}`)
    }

    case 'set_layer_name': {
      if (!projectPath) throw new GodotMCPError('No project path specified', 'INVALID_ARGS', 'Provide project_path.')
      const layerNum = (args.layer_number as number) || 1
      const dimension = (args.dimension as string) || '2d'
      const name = args.name as string
      if (!name) throw new GodotMCPError('No name specified', 'INVALID_ARGS', 'Provide layer name.')

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
