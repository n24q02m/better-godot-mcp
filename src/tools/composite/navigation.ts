/**
 * Navigation tool - Navigation regions, agents, and obstacles
 * Actions: create_region | add_agent | add_obstacle
 */

import { readFile, writeFile } from 'node:fs/promises'
import type { GodotConfig } from '../../godot/types.js'
import { formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
import { resolveProjectRoot, safeResolve } from '../helpers/paths.js'

function appendNode(content: string, name: string, type: string, parent: string, extraProps?: string): string {
  const parentAttr = parent === '.' ? '' : ` parent="${parent}"`
  let nodeDecl = `\n[node name="${name}" type="${type}"${parentAttr}]\n`
  if (extraProps) nodeDecl += `${extraProps}\n`
  return `${content.trimEnd()}\n${nodeDecl}`
}

async function handleAction(
  _action: string,
  projectPath: string,
  args: Record<string, unknown>,
  nodeTypeBase: string,
  extraPropsResolver?: (args: Record<string, unknown>) => string,
) {
  const scenePath = args.scene_path as string
  if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
  const name = (args.name as string) || nodeTypeBase
  const parent = (args.parent as string) || '.'
  const dimension = (args.dimension as string) || '3D'

  if (
    name.includes('\n') ||
    name.includes('\r') ||
    name.includes('"') ||
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

  const fullPath = safeResolve(projectPath, scenePath)
  let content: string
  try {
    content = await readFile(fullPath, 'utf-8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')
    }
    throw err
  }

  const nodeType = dimension === '2D' ? `${nodeTypeBase}2D` : `${nodeTypeBase}3D`
  const extraProps = extraPropsResolver ? extraPropsResolver(args) : undefined
  content = appendNode(content, name, nodeType, parent, extraProps)

  await writeFile(fullPath, content, 'utf-8')
  return formatSuccess(`Added ${nodeTypeBase}: ${name} (${nodeType})`)
}

export async function handleNavigation(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const projectPath = resolveProjectRoot(args.project_path, config.projectPath)

  switch (action) {
    case 'create_region':
      return handleAction(action, projectPath, args, 'NavigationRegion')

    case 'add_agent':
      return handleAction(action, projectPath, args, 'NavigationAgent', (a) => {
        let props = ''
        if (a.radius) props += `radius = ${a.radius}\n`
        if (a.max_speed) props += `max_speed = ${a.max_speed}\n`
        if (a.path_desired_distance) props += `path_desired_distance = ${a.path_desired_distance}\n`
        if (a.target_desired_distance) props += `target_desired_distance = ${a.target_desired_distance}\n`
        return props
      })

    case 'add_obstacle':
      return handleAction(action, projectPath, args, 'NavigationObstacle', (a) => {
        let props = ''
        if (a.radius) props += `radius = ${a.radius}\n`
        if (a.avoidance_enabled !== undefined) props += `avoidance_enabled = ${a.avoidance_enabled}\n`
        return props
      })

    default:
      throwUnknownAction(action, ['create_region', 'add_agent', 'add_obstacle'])
  }
}
