/**
 * Animation tool - AnimationPlayer and animation management
 * Actions: create_player | add_animation | add_track | add_keyframe | list
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError } from '../helpers/errors.js'

function resolveScene(projectPath: string | null | undefined, scenePath: string): string {
  const fullPath = projectPath ? resolve(projectPath, scenePath) : resolve(scenePath)
  if (!existsSync(fullPath))
    throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')
  return fullPath
}

export async function handleAnimation(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const projectPath = (args.project_path as string) || config.projectPath

  switch (action) {
    case 'create_player': {
      const scenePath = args.scene_path as string
      if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
      const playerName = (args.name as string) || 'AnimationPlayer'
      const parent = (args.parent as string) || '.'

      const fullPath = resolveScene(projectPath, scenePath)
      let content = readFileSync(fullPath, 'utf-8')

      const parentAttr = parent === '.' ? '' : ` parent="${parent}"`
      const nodeDecl = `\n[node name="${playerName}" type="AnimationPlayer"${parentAttr}]\n`
      content = `${content.trimEnd()}\n${nodeDecl}`

      writeFileSync(fullPath, content, 'utf-8')
      return formatSuccess(`Created AnimationPlayer: ${playerName} under ${parent}`)
    }

    case 'add_animation': {
      const scenePath = args.scene_path as string
      if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
      const animName = args.anim_name as string
      if (!animName) throw new GodotMCPError('No anim_name specified', 'INVALID_ARGS', 'Provide animation name.')
      const duration = (args.duration as number) || 1.0
      const loop = args.loop !== false

      const fullPath = resolveScene(projectPath, scenePath)
      let content = readFileSync(fullPath, 'utf-8')

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

      writeFileSync(fullPath, content, 'utf-8')
      return formatSuccess(`Added animation: ${animName} (duration: ${duration}s, loop: ${loop})`)
    }

    case 'add_track': {
      const scenePath = args.scene_path as string
      if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
      const animName = args.anim_name as string
      const trackType = (args.track_type as string) || 'value'
      const nodePath = args.node_path as string
      const property = args.property as string
      if (!animName || !nodePath || !property) {
        throw new GodotMCPError(
          'anim_name, node_path, and property required',
          'INVALID_ARGS',
          'All three are required.',
        )
      }

      const fullPath = resolveScene(projectPath, scenePath)
      const content = readFileSync(fullPath, 'utf-8')

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
      writeFileSync(fullPath, updated, 'utf-8')

      return formatSuccess(`Added ${trackType} track: ${trackPath} to animation ${animName}`)
    }

    case 'add_keyframe': {
      // Keyframes are typically added at runtime or via complex .tres editing
      // For now, provide guidance
      return formatSuccess(
        `Keyframe addition requires modifying Animation resource data.\n` +
          `For simple cases, edit the .tscn directly or use Godot editor.\n` +
          `Track data format: tracks/N/keys = { "times": PackedFloat32Array(0, 1), "values": [val1, val2] }`,
      )
    }

    case 'list': {
      const scenePath = args.scene_path as string
      if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')

      const fullPath = resolveScene(projectPath, scenePath)
      const content = readFileSync(fullPath, 'utf-8')

      const animations: { name: string; duration?: string; loop?: boolean }[] = []
      const animRegex = /\[sub_resource type="Animation" id="([^"]+)"\]/g
      for (const match of content.matchAll(animRegex)) {
        const id = match[1]
        const nameMatch = content.slice(match.index).match(/resource_name\s*=\s*"([^"]*)"/)
        const durationMatch = content.slice(match.index).match(/length\s*=\s*([\d.]+)/)
        const loopMatch = content.slice(match.index).match(/loop_mode\s*=\s*(\d+)/)
        animations.push({
          name: nameMatch?.[1] || id,
          duration: durationMatch?.[1],
          loop: loopMatch ? loopMatch[1] !== '0' : false,
        })
      }

      // Also find AnimationPlayer nodes
      const players: string[] = []
      const playerRegex = /\[node name="([^"]+)" type="AnimationPlayer"/g
      for (const playerMatch of content.matchAll(playerRegex)) {
        players.push(playerMatch[1])
      }

      return formatJSON({ scene: scenePath, players, animations })
    }

    default:
      throw new GodotMCPError(
        `Unknown action: ${action}`,
        'INVALID_ACTION',
        'Valid actions: create_player, add_animation, add_track, add_keyframe, list. Use help tool for full docs.',
      )
  }
}
