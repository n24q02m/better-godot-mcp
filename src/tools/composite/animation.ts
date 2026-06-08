/**
 * Animation tool - AnimationPlayer and animation resource management
 * Actions: create_player | add_animation | add_track | add_keyframe | list
 */

import { readFile, writeFile } from 'node:fs/promises'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
import { resolveProjectRoot, safeResolve } from '../helpers/paths.js'

async function resolveScene(projectRoot: string, scenePath: string): Promise<string> {
  return safeResolve(projectRoot, scenePath)
}

async function handleCreatePlayer(projectPath: string, args: Record<string, unknown>) {
  const scenePath = args.scene_path as string
  if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
  const playerName = (args.name as string) || 'AnimationPlayer'
  const parent = (args.parent as string) || '.'

  if (
    playerName.includes('\n') ||
    playerName.includes('\r') ||
    playerName.includes('"') ||
    parent.includes('\n') ||
    parent.includes('\r') ||
    parent.includes('"')
  ) {
    throw new GodotMCPError(
      'Invalid characters in parameters',
      'INVALID_ARGS',
      'Parameters must not contain quotes or newlines.',
    )
  }

  const fullPath = await resolveScene(projectPath, scenePath)
  let content: string
  try {
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
  return formatSuccess(`Created AnimationPlayer: ${playerName} in ${scenePath}`)
}

async function handleAddAnimation(projectPath: string, args: Record<string, unknown>) {
  const scenePath = args.scene_path as string
  if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
  const animName = (args.name as string) || (args.anim_name as string)
  if (!animName) throw new GodotMCPError('No anim_name specified', 'INVALID_ARGS', 'Provide anim name.')
  const duration = (args.duration as number) || 1.0
  const loop = args.loop !== undefined ? !!args.loop : true

  if (
    animName.includes('\n') ||
    animName.includes('\r') ||
    animName.includes('"') ||
    typeof duration !== 'number' ||
    duration <= 0
  ) {
    throw new GodotMCPError(
      'Invalid characters in anim_name',
      'INVALID_ARGS',
      'Animation name must not contain quotes/newlines, duration must be positive number.',
    )
  }

  const fullPath = await resolveScene(projectPath, scenePath)
  let content: string
  try {
    content = await readFile(fullPath, 'utf-8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')
    }
    throw err
  }

  // Count existing sub_resources to get next ID
  const _subResCount = (content.match(/\[sub_resource/g) || []).length + 1
  const animId = `Animation_${animName}`

  const loopMode = loop ? 1 : 0
  const animRes = [
    `[sub_resource type="Animation" id="${animId}"]`,
    `resource_name = "${animName}"`,
    `length = ${Number.isInteger(duration) ? duration : duration.toFixed(2)}`,
    `loop_mode = ${loopMode}`,
    '',
  ].join('\n')

  // Insert before [resource] or at end
  const resIdx = content.indexOf('[resource]')
  if (resIdx !== -1) {
    content = `${content.slice(0, resIdx)}${animRes}\n${content.slice(resIdx)}`
  } else {
    content = `${content.trimEnd()}\n\n${animRes}`
  }

  await writeFile(fullPath, content, 'utf-8')
  return formatSuccess(`Added animation: ${animName}`)
}

async function handleAddTrack(projectPath: string, args: Record<string, unknown>) {
  const scenePath = args.scene_path as string
  if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
  const animName = (args.animation_name as string) || (args.anim_name as string)
  const nodePath = (args.node_path as string) || (args.track_path as string)
  const property = args.property as string
  const trackType = (args.type as string) || 'value'

  if (!animName || !nodePath || !property) {
    throw new GodotMCPError(
      'anim_name, node_path, and property required',
      'INVALID_ARGS',
      'Both animation_name and node_path are required.',
    )
  }

  const finalTrackPath = `${nodePath}:${property}`

  if (
    animName.includes('\n') ||
    animName.includes('\r') ||
    animName.includes('"') ||
    finalTrackPath.includes('\n') ||
    finalTrackPath.includes('\r') ||
    finalTrackPath.includes('"')
  ) {
    throw new GodotMCPError(
      'Invalid characters in parameters',
      'INVALID_ARGS',
      'Parameters must not contain quotes or newlines.',
    )
  }

  const fullPath = await resolveScene(projectPath, scenePath)
  let content: string
  try {
    content = await readFile(fullPath, 'utf-8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')
    }
    throw err
  }

  const animIdx = content.indexOf(`resource_name = "${animName}"`)
  if (animIdx === -1) {
    throw new GodotMCPError(`Animation "${animName}" not found`, 'ANIMATION_ERROR', 'Add the animation first.')
  }

  // Find start of this Animation sub_resource
  const startIdx = content.lastIndexOf('[sub_resource type="Animation"', animIdx)
  if (startIdx === -1) {
    throw new GodotMCPError(`Animation "${animName}" not found`, 'ANIMATION_ERROR', 'Add the animation first.')
  }

  // Count existing tracks in this animation block
  let blockEndIdx = content.indexOf('\n[', animIdx + 1)
  if (blockEndIdx === -1) blockEndIdx = content.length
  const animBlock = content.slice(startIdx, blockEndIdx)
  const trackCount = (animBlock.match(/tracks\/\d+\//g) || []).length

  const trackKey = trackCount > 0 ? `tracks/${trackCount}` : `tracks/${trackType}`

  const trackInfo = [
    `${trackKey}/type = "${trackType}"`,
    `${trackKey}/imported = false`,
    `${trackKey}/enabled = true`,
    `${trackKey}/path = NodePath("${finalTrackPath}")`,
    `${trackKey}/interp = 1`,
    `${trackKey}/loop_wrap = true`,
    `${trackKey}/keys = { "times": PackedFloat32Array(), "transitions": PackedFloat32Array(), "update": 1, "values": [] }`,
  ].join('\n')

  const updated = `${content.slice(0, blockEndIdx)}\n${trackInfo}${content.slice(blockEndIdx)}`
  await writeFile(fullPath, updated, 'utf-8')

  return formatSuccess(`Added ${trackType} track: ${finalTrackPath} to animation ${animName}`)
}

async function handleListAnimations(projectPath: string, args: Record<string, unknown>) {
  const scenePath = args.scene_path as string
  if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')

  const fullPath = await resolveScene(projectPath, scenePath)
  let content: string
  try {
    content = await readFile(fullPath, 'utf-8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')
    }
    throw err
  }

  const animations: { name: string; duration?: string; loop?: boolean }[] = []
  const animRegex = /\[sub_resource type="Animation" id="([^"]+)"\]/g
  for (const match of content.matchAll(animRegex)) {
    const id = match[1]
    const startIndex = match.index
    let endIndex = content.indexOf('\n[', startIndex + 1)
    if (endIndex === -1) endIndex = content.length
    const block = content.slice(startIndex, endIndex)

    const nameMatch = block.match(/resource_name\s*=\s*"([^"]*)"/)
    const durationMatch = block.match(/length\s*=\s*([\d.]+)/)
    const loopMatch = block.match(/loop_mode\s*=\s*(\d+)/)
    animations.push({
      name: nameMatch?.[1] || id,
      duration: durationMatch
        ? Number.isInteger(parseFloat(durationMatch[1]))
          ? parseInt(durationMatch[1], 10).toString()
          : durationMatch[1]
        : undefined,
      loop: loopMatch ? loopMatch[1] !== '0' : false,
    })
  }

  const players: string[] = []
  const playerRegex = /\[node name="([^"]+)" type="AnimationPlayer"/g
  for (const playerMatch of content.matchAll(playerRegex)) {
    players.push(playerMatch[1])
  }

  return formatJSON({ scene: scenePath, players, animations })
}

const ANIMATION_ACTIONS: Record<string, (projectPath: string, args: Record<string, unknown>) => Promise<string>> = {
  create_player: handleCreatePlayer,
  add_animation: handleAddAnimation,
  add_track: handleAddTrack,
  add_keyframe: async () =>
    formatSuccess(
      `Keyframe addition requires modifying Animation resource data.\n` +
        `For simple cases, edit the .tscn directly or use Godot editor.\n` +
        `Track data format: tracks/N/keys = { "times": PackedFloat32Array(0, 1), "values": [val1, val2] }`,
    ),
  list: handleListAnimations,
}

export async function handleAnimation(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const projectPath = resolveProjectRoot(args.project_path, config.projectPath)
  const handler = ANIMATION_ACTIONS[action]
  if (!handler) {
    throwUnknownAction(action, Object.keys(ANIMATION_ACTIONS))
  }
  return handler(projectPath, args)
}
