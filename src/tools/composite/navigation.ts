/**
 * Navigation tool - Navigation regions, agents, and obstacles
 * Actions: create_region | add_agent | add_obstacle
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { GodotConfig } from '../../godot/types.js'
import { formatSuccess, GodotMCPError } from '../helpers/errors.js'

function resolveScene(projectPath: string | null | undefined, scenePath: string): string {
  const fullPath = projectPath ? resolve(projectPath, scenePath) : resolve(scenePath)
  if (!existsSync(fullPath))
    throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')
  return fullPath
}

function appendNode(content: string, name: string, type: string, parent: string, extraProps?: string): string {
  const parentAttr = parent === '.' ? '' : ` parent="${parent}"`
  let nodeDecl = `\n[node name="${name}" type="${type}"${parentAttr}]\n`
  if (extraProps) nodeDecl += `${extraProps}\n`
  return `${content.trimEnd()}\n${nodeDecl}`
}

export async function handleNavigation(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const projectPath = (args.project_path as string) || config.projectPath

  switch (action) {
    case 'create_region': {
      const scenePath = args.scene_path as string
      if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
      const regionName = (args.name as string) || 'NavigationRegion3D'
      const parent = (args.parent as string) || '.'
      const dimension = (args.dimension as string) || '3D'

      const fullPath = resolveScene(projectPath, scenePath)
      let content = readFileSync(fullPath, 'utf-8')

      const nodeType = dimension === '2D' ? 'NavigationRegion2D' : 'NavigationRegion3D'
      content = appendNode(content, regionName, nodeType, parent)

      writeFileSync(fullPath, content, 'utf-8')
      return formatSuccess(`Created navigation region: ${regionName} (${nodeType})`)
    }

    case 'add_agent': {
      const scenePath = args.scene_path as string
      if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
      const agentName = (args.name as string) || 'NavigationAgent3D'
      const parent = (args.parent as string) || '.'
      const dimension = (args.dimension as string) || '3D'

      const fullPath = resolveScene(projectPath, scenePath)
      let content = readFileSync(fullPath, 'utf-8')

      const nodeType = dimension === '2D' ? 'NavigationAgent2D' : 'NavigationAgent3D'
      let extraProps = ''
      if (args.radius) extraProps += `radius = ${args.radius}\n`
      if (args.max_speed) extraProps += `max_speed = ${args.max_speed}\n`
      if (args.path_desired_distance) extraProps += `path_desired_distance = ${args.path_desired_distance}\n`
      if (args.target_desired_distance) extraProps += `target_desired_distance = ${args.target_desired_distance}\n`

      content = appendNode(content, agentName, nodeType, parent, extraProps || undefined)

      writeFileSync(fullPath, content, 'utf-8')
      return formatSuccess(`Added navigation agent: ${agentName} (${nodeType})`)
    }

    case 'add_obstacle': {
      const scenePath = args.scene_path as string
      if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
      const obstacleName = (args.name as string) || 'NavigationObstacle3D'
      const parent = (args.parent as string) || '.'
      const dimension = (args.dimension as string) || '3D'

      const fullPath = resolveScene(projectPath, scenePath)
      let content = readFileSync(fullPath, 'utf-8')

      const nodeType = dimension === '2D' ? 'NavigationObstacle2D' : 'NavigationObstacle3D'
      let extraProps = ''
      if (args.radius) extraProps += `radius = ${args.radius}\n`
      if (args.avoidance_enabled !== undefined) extraProps += `avoidance_enabled = ${args.avoidance_enabled}\n`

      content = appendNode(content, obstacleName, nodeType, parent, extraProps || undefined)

      writeFileSync(fullPath, content, 'utf-8')
      return formatSuccess(`Added navigation obstacle: ${obstacleName} (${nodeType})`)
    }

    default:
      throw new GodotMCPError(
        `Unknown action: ${action}`,
        'INVALID_ACTION',
        'Valid actions: create_region, add_agent, add_obstacle. Use help tool for full docs.',
      )
  }
}
