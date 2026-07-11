/**
 * Animation tool - AnimationPlayer and animation management
 * Actions: create_player | add_animation | add_track | add_keyframe | list
 */

import { readFile, writeFile } from 'node:fs/promises'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
import { resolveProjectRoot, safeResolve } from '../helpers/paths.js'
import { parseSceneContent } from '../helpers/scene-parser.js'
import { validateNoNewlines } from '../helpers/security.js'

// ⚡ Bolt: Removed redundant pathExists. Instead return resolved path and use try/catch in handlers where needed.
function resolveScene(projectRoot: string, scenePath: string): string {
  return safeResolve(projectRoot, scenePath)
}

async function handleCreatePlayer(projectPath: string, args: Record<string, unknown>) {
  const scenePath = args.scene_path as string
  if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
  const playerName = (args.name as string) || 'AnimationPlayer'
  const parent = (args.parent as string) || '.'

  validateNoNewlines('Invalid characters in parameters', playerName, parent)
  if (playerName.includes('"') || parent.includes('"')) {
    throw new GodotMCPError('Invalid characters in parameters', 'INVALID_ARGS', 'Parameters must not contain quotes.')
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
  const nodeDecl = `\n[node name="${playerName}" type="AnimationPlayer"${parentAttr}]\n`
  content = `${content.trimEnd()}\n${nodeDecl}`

  await writeFile(fullPath, content, 'utf-8')
  return formatSuccess(`Created AnimationPlayer: ${playerName} under ${parent}`)
}

async function handleAddAnimation(projectPath: string, args: Record<string, unknown>) {
  const scenePath = args.scene_path as string
  if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
  const animName = args.anim_name as string
  if (!animName) throw new GodotMCPError('No anim_name specified', 'INVALID_ARGS', 'Provide animation name.')
  if (args.duration !== undefined && typeof args.duration !== 'number') {
    throw new GodotMCPError('duration must be a number', 'INVALID_ARGS')
  }
  const duration = (args.duration as number) || 1.0
  const loop = args.loop !== false

  validateNoNewlines('Invalid characters in anim_name', animName)
  if (animName.includes('"')) {
    throw new GodotMCPError('Invalid characters in anim_name', 'INVALID_ARGS', 'Parameters must not contain quotes.')
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

  // Add sub_resource for animation
  const animId = `Animation_${animName}`
  const loopMode = loop ? 1 : 0
  const animResource = `\n[sub_resource type="Animation" id="${animId}"]\nresource_name = "${animName}"\nlength = ${duration}\nloop_mode = ${loopMode}\n`

  // Insert before first [node]
  const nodeIdx = content.indexOf('[node')
  if (nodeIdx === -1) {
    content += animResource
  } else {
    content = `${content.slice(0, nodeIdx)}${animResource}\n${content.slice(nodeIdx)}`
  }

  await writeFile(fullPath, content, 'utf-8')
  return formatSuccess(`Added animation: ${animName} (duration: ${duration}s, loop: ${loop})`)
}

async function handleAddTrack(projectPath: string, args: Record<string, unknown>) {
  const scenePath = args.scene_path as string
  if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
  const animName = args.anim_name as string
  const trackType = (args.track_type as string) || 'value'
  const nodePath = args.node_path as string
  const property = args.property as string
  if (!animName || !nodePath || !property) {
    throw new GodotMCPError('anim_name, node_path, and property required', 'INVALID_ARGS', 'All three are required.')
  }

  validateNoNewlines('Invalid characters in parameters', animName, trackType, nodePath, property)
  if (animName.includes('"') || trackType.includes('"') || nodePath.includes('"') || property.includes('"')) {
    throw new GodotMCPError('Invalid characters in parameters', 'INVALID_ARGS', 'Parameters must not contain quotes.')
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

  const trackPath = `${nodePath}:${property}`
  const trackInfo = `tracks/${trackType}/type = "${trackType}"\ntracks/${trackType}/path = NodePath("${trackPath}")\n`

  // Find the animation sub_resource and append track
  const animId = `Animation_${animName}`
  const animIdx = content.indexOf(`id="${animId}"`)
  if (animIdx === -1) {
    throw new GodotMCPError(`Animation "${animName}" not found`, 'ANIMATION_ERROR', 'Create the animation first.')
  }

  // Find end of this sub_resource section
  let endIdx = content.indexOf('\n[', animIdx + 1)
  if (endIdx === -1) endIdx = content.length

  const updated = `${content.slice(0, endIdx)}\n${trackInfo}${content.slice(endIdx)}`
  await writeFile(fullPath, updated, 'utf-8')

  return formatSuccess(`Added ${trackType} track: ${trackPath} to animation ${animName}`)
}

async function handleAddKeyframe() {
  // Keyframes are typically added at runtime or via complex .tres editing
  // For now, provide guidance
  return formatSuccess(
    `Keyframe addition requires modifying Animation resource data.\n` +
      `For simple cases, edit the .tscn directly or use Godot editor.\n` +
      `Track data format: tracks/N/keys = { "times": PackedFloat32Array(0, 1), "values": [val1, val2] }`,
  )
}

async function handleListAnimations(projectPath: string, args: Record<string, unknown>) {
  const scenePath = args.scene_path as string
  if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')

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

  // ⚡ Bolt: Replace RegExp.matchAll() with a centralized structural parser (parseSceneContent)
  // to avoid repeatedly parsing the file and creating intermediate arrays for matches and slicing.
  const parsed = parseSceneContent(content)
  const animations: { name: string; duration?: string; loop?: boolean }[] = []

  for (let i = 0; i < parsed.subResources.length; i++) {
    const sub = parsed.subResources[i]
    if (sub.type === 'Animation') {
      const resourceName = sub.properties.resource_name
      let name = sub.id
      if (resourceName) {
        // Strip quotes if present
        name = resourceName.startsWith('"') && resourceName.endsWith('"') ? resourceName.slice(1, -1) : resourceName
      }

      const duration = sub.properties.length
      const loopMode = sub.properties.loop_mode

      animations.push({
        name,
        duration,
        loop: loopMode ? loopMode !== '0' : false,
      })
    }
  }

  // ⚡ Bolt: Fast extraction of specific node types using O(1) index lookup
  // instead of O(N) scene iteration
  const players: string[] = []
  const playerNodes = parsed.nodesByType.get('AnimationPlayer')
  if (playerNodes) {
    for (let i = 0; i < playerNodes.length; i++) {
      players.push(playerNodes[i].name)
    }
  }

  return formatJSON({ scene: scenePath, players, animations })
}

/** Tool result type used by MCP handlers */
type ToolResult = { content: Array<{ type: string; text: string }>; isError?: boolean }

const ANIMATION_ACTIONS: Record<string, (projectPath: string, args: Record<string, unknown>) => Promise<ToolResult>> = {
  create_player: handleCreatePlayer,
  add_animation: handleAddAnimation,
  add_track: handleAddTrack,
  add_keyframe: () => handleAddKeyframe(),
  list: handleListAnimations,
}

export async function handleAnimation(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const projectPath = resolveProjectRoot(args.project_path, config.projectPath)

  if (Object.hasOwn(ANIMATION_ACTIONS, action)) {
    const handler = ANIMATION_ACTIONS[action]
    if (handler) {
      return handler(projectPath, args)
    }
  }

  throwUnknownAction(action, Object.keys(ANIMATION_ACTIONS))
}
