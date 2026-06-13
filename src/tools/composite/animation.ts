/**
 * Animation tool - AnimationPlayer and animation management
 * Actions: create_player | add_animation | add_track | add_keyframe | list
 */

import { readFile, writeFile } from 'node:fs/promises'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
import { pathExists, resolveProjectRoot, safeResolve } from '../helpers/paths.js'
import { validateNoNewlines } from '../helpers/security.js'

async function resolveScene(projectRoot: string, scenePath: string): Promise<string> {
  const fullPath = safeResolve(projectRoot, scenePath)
  if (!(await pathExists(fullPath)))
    throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')
  return fullPath
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

  const fullPath = await resolveScene(projectPath, scenePath)
  let content = await readFile(fullPath, 'utf-8')

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
  const duration = (args.duration as number) || 1.0
  const loop = args.loop !== false

  validateNoNewlines('Invalid characters in anim_name', animName)
  if (animName.includes('"')) {
    throw new GodotMCPError('Invalid characters in anim_name', 'INVALID_ARGS', 'Parameters must not contain quotes.')
  }

  const fullPath = await resolveScene(projectPath, scenePath)
  let content = await readFile(fullPath, 'utf-8')

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

  const fullPath = await resolveScene(projectPath, scenePath)
  const content = await readFile(fullPath, 'utf-8')

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

  const fullPath = await resolveScene(projectPath, scenePath)
  const content = await readFile(fullPath, 'utf-8')

  const animations: { name: string; duration?: string; loop?: boolean }[] = []

  // Efficiently scan for animations without matchAll/slicing the whole block
  const animSearch = '[sub_resource type="Animation"'
  let pos = 0
  while (true) {
    pos = content.indexOf(animSearch, pos)
    if (pos === -1) break

    const idStart = content.indexOf('id="', pos)
    if (idStart === -1) {
      pos += animSearch.length
      continue
    }
    const idEnd = content.indexOf('"', idStart + 4)
    if (idEnd === -1) {
      pos += animSearch.length
      continue
    }
    const id = content.slice(idStart + 4, idEnd)

    // Find end of block
    let endIdx = content.indexOf('\n[', idEnd)
    if (endIdx === -1) endIdx = content.length

    // Scan for properties within the range [idEnd, endIdx]
    let name: string = id
    const nameLabel = 'resource_name = "'
    const nameIdx = content.indexOf(nameLabel, idEnd)
    if (nameIdx !== -1 && nameIdx < endIdx) {
      const qEnd = content.indexOf('"', nameIdx + nameLabel.length)
      if (qEnd !== -1 && qEnd < endIdx) {
        name = content.slice(nameIdx + nameLabel.length, qEnd)
      }
    }

    let duration: string | undefined
    const lenLabel = 'length = '
    const lenIdx = content.indexOf(lenLabel, idEnd)
    if (lenIdx !== -1 && lenIdx < endIdx) {
      let current = lenIdx + lenLabel.length
      const start = current
      while (current < endIdx && /[0-9.]/.test(content[current])) current++
      duration = content.slice(start, current)
    }

    let loop = false
    const loopLabel = 'loop_mode = '
    const loopIdx = content.indexOf(loopLabel, idEnd)
    if (loopIdx !== -1 && loopIdx < endIdx) {
      const mode = content[loopIdx + loopLabel.length]
      loop = mode !== '0'
    }

    animations.push({ name, duration, loop })
    pos = endIdx
  }

  // Also find AnimationPlayer nodes
  const players: string[] = []
  const playerSearch = '[node name="'
  const playerSuffix = '" type="AnimationPlayer"'
  pos = 0
  while (true) {
    pos = content.indexOf(playerSearch, pos)
    if (pos === -1) break

    const nameStart = pos + playerSearch.length
    const nameEnd = content.indexOf('"', nameStart)
    if (nameEnd === -1) {
      pos = nameStart
      continue
    }

    if (content.startsWith(playerSuffix, nameEnd)) {
      players.push(content.slice(nameStart, nameEnd))
      pos = nameEnd + playerSuffix.length
    } else {
      pos = nameStart
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

  const handler = ANIMATION_ACTIONS[action]
  if (handler) {
    return handler(projectPath, args)
  }

  throwUnknownAction(action, Object.keys(ANIMATION_ACTIONS))
}
