/**
 * Navigation tool - Navigation regions, agents, and obstacles
 * Actions: create_region | add_agent | add_obstacle
 */

import { readFile, writeFile } from 'node:fs/promises'
import type { GodotConfig } from '../../godot/types.js'
import { formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
import { resolveProjectRoot, safeResolve } from '../helpers/paths.js'
import { validateStringArguments } from '../helpers/security.js'

// ⚡ Bolt: Removed redundant pathExists. Instead return resolved path and use try/catch in handlers where needed.
function resolveScene(projectRoot: string, scenePath: string): string {
  return safeResolve(projectRoot, scenePath)
}

function appendNode(content: string, name: string, type: string, parent: string, extraProps?: string): string {
  const parentAttr = parent === '.' ? '' : ` parent="${parent}"`
  let nodeDecl = `\n[node name="${name}" type="${type}"${parentAttr}]\n`
  if (extraProps) nodeDecl += `${extraProps}\n`
  return `${content.trimEnd()}\n${nodeDecl}`
}

export async function handleNavigation(action: string, args: Record<string, unknown>, config: GodotConfig) {
  validateStringArguments(undefined, args.project_path)
  const projectPath = resolveProjectRoot(args.project_path, config.projectPath)

  switch (action) {
    case 'create_region': {
      const scenePath = args.scene_path as string
      if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
      const rawRegionName = args.name
      const rawParent = args.parent
      const rawDimension = args.dimension
      validateStringArguments('Invalid characters in parameters', scenePath, rawRegionName, rawParent, rawDimension)
      const regionName = (rawRegionName ?? 'NavigationRegion3D') as string
      const parent = (rawParent ?? '.') as string
      const dimension = (rawDimension ?? '3D') as string

      if (
        regionName.includes('\n') ||
        regionName.includes('\r') ||
        regionName.includes('"') ||
        parent.includes('\n') ||
        parent.includes('\r') ||
        parent.includes('"') ||
        dimension.includes('\n') ||
        dimension.includes('\r') ||
        dimension.includes('"')
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

      const nodeType = dimension === '2D' ? 'NavigationRegion2D' : 'NavigationRegion3D'
      content = appendNode(content, regionName, nodeType, parent)

      await writeFile(fullPath, content, 'utf-8')
      return formatSuccess(`Created navigation region: ${regionName} (${nodeType})`)
    }

    case 'add_agent': {
      const scenePath = args.scene_path as string
      if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
      const rawAgentName = args.name
      const rawParent = args.parent
      const rawDimension = args.dimension
      validateStringArguments('Invalid characters in parameters', scenePath, rawAgentName, rawParent, rawDimension)
      const agentName = (rawAgentName ?? 'NavigationAgent3D') as string
      const parent = (rawParent ?? '.') as string
      const dimension = (rawDimension ?? '3D') as string

      if (
        agentName.includes('\n') ||
        agentName.includes('\r') ||
        agentName.includes('"') ||
        parent.includes('\n') ||
        parent.includes('\r') ||
        parent.includes('"') ||
        dimension.includes('\n') ||
        dimension.includes('\r') ||
        dimension.includes('"')
      ) {
        throw new GodotMCPError(
          'Invalid characters in parameters',
          'INVALID_ARGS',
          'Parameters must not contain quotes or newlines.',
        )
      }

      for (const property of ['radius', 'max_speed', 'path_desired_distance', 'target_desired_distance'] as const) {
        if (
          args[property] !== undefined &&
          args[property] !== null &&
          (typeof args[property] !== 'number' || !Number.isFinite(args[property]))
        ) {
          throw new GodotMCPError(`${property} must be a number`, 'INVALID_ARGS')
        }
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

      const nodeType = dimension === '2D' ? 'NavigationAgent2D' : 'NavigationAgent3D'
      let extraProps = ''
      if (args.radius !== undefined && args.radius !== null) extraProps += `radius = ${args.radius}\n`
      if (args.max_speed !== undefined && args.max_speed !== null) extraProps += `max_speed = ${args.max_speed}\n`
      if (args.path_desired_distance !== undefined && args.path_desired_distance !== null)
        extraProps += `path_desired_distance = ${args.path_desired_distance}\n`
      if (args.target_desired_distance !== undefined && args.target_desired_distance !== null)
        extraProps += `target_desired_distance = ${args.target_desired_distance}\n`

      content = appendNode(content, agentName, nodeType, parent, extraProps || undefined)

      await writeFile(fullPath, content, 'utf-8')
      return formatSuccess(`Added navigation agent: ${agentName} (${nodeType})`)
    }

    case 'add_obstacle': {
      const scenePath = args.scene_path as string
      if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
      const rawObstacleName = args.name
      const rawParent = args.parent
      const rawDimension = args.dimension
      validateStringArguments('Invalid characters in parameters', scenePath, rawObstacleName, rawParent, rawDimension)
      const obstacleName = (rawObstacleName ?? 'NavigationObstacle3D') as string
      const parent = (rawParent ?? '.') as string
      const dimension = (rawDimension ?? '3D') as string

      if (
        obstacleName.includes('\n') ||
        obstacleName.includes('\r') ||
        obstacleName.includes('"') ||
        parent.includes('\n') ||
        parent.includes('\r') ||
        parent.includes('"') ||
        dimension.includes('\n') ||
        dimension.includes('\r') ||
        dimension.includes('"')
      ) {
        throw new GodotMCPError(
          'Invalid characters in parameters',
          'INVALID_ARGS',
          'Parameters must not contain quotes or newlines.',
        )
      }

      if (
        args.radius !== undefined &&
        args.radius !== null &&
        (typeof args.radius !== 'number' || !Number.isFinite(args.radius))
      ) {
        throw new GodotMCPError('radius must be a number', 'INVALID_ARGS')
      }
      if (
        args.avoidance_enabled !== undefined &&
        args.avoidance_enabled !== null &&
        typeof args.avoidance_enabled !== 'boolean'
      ) {
        throw new GodotMCPError('avoidance_enabled must be a boolean', 'INVALID_ARGS')
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

      const nodeType = dimension === '2D' ? 'NavigationObstacle2D' : 'NavigationObstacle3D'
      let extraProps = ''
      if (args.radius !== undefined && args.radius !== null) extraProps += `radius = ${args.radius}\n`
      if (args.avoidance_enabled !== undefined && args.avoidance_enabled !== null)
        extraProps += `avoidance_enabled = ${args.avoidance_enabled}\n`

      content = appendNode(content, obstacleName, nodeType, parent, extraProps || undefined)

      await writeFile(fullPath, content, 'utf-8')
      return formatSuccess(`Added navigation obstacle: ${obstacleName} (${nodeType})`)
    }

    default:
      throwUnknownAction(action, ['create_region', 'add_agent', 'add_obstacle'])
  }
}
