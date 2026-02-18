/**
 * Signals tool - Signal connection management in .tscn scenes
 * Actions: list | connect | disconnect
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError } from '../helpers/errors.js'
import { parseSceneContent } from '../helpers/scene-parser.js'

export async function handleSignals(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const projectPath = (args.project_path as string) || config.projectPath
  const scenePath = args.scene_path as string

  if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
  const fullPath = projectPath ? resolve(projectPath, scenePath) : resolve(scenePath)
  if (!existsSync(fullPath))
    throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')

  switch (action) {
    case 'list': {
      const content = readFileSync(fullPath, 'utf-8')
      const scene = parseSceneContent(content)

      return formatJSON({
        scene: scenePath,
        count: scene.connections.length,
        connections: scene.connections.map((c) => ({
          signal: c.signal,
          from: c.from,
          to: c.to,
          method: c.method,
          flags: c.flags,
        })),
      })
    }

    case 'connect': {
      const signal = args.signal as string
      const from = args.from as string
      const to = args.to as string
      const method = args.method as string
      if (!signal || !from || !to || !method) {
        throw new GodotMCPError(
          'signal, from, to, and method required',
          'INVALID_ARGS',
          'Provide signal name, source node, target node, and method name.',
        )
      }

      const flags = args.flags as number | undefined

      let content = readFileSync(fullPath, 'utf-8')

      // Check for duplicate
      const scene = parseSceneContent(content)
      const existing = scene.connections.find(
        (c) => c.signal === signal && c.from === from && c.to === to && c.method === method,
      )
      if (existing) {
        throw new GodotMCPError(
          'Connection already exists',
          'SIGNAL_ERROR',
          'This signal connection is already defined.',
        )
      }

      // Append connection
      const flagsAttr = flags !== undefined ? ` flags=${flags}` : ''
      const connectionLine = `\n[connection signal="${signal}" from="${from}" to="${to}" method="${method}"${flagsAttr}]\n`
      content = `${content.trimEnd()}\n${connectionLine}`

      writeFileSync(fullPath, content, 'utf-8')
      return formatSuccess(`Connected: ${from}.${signal} -> ${to}.${method}()`)
    }

    case 'disconnect': {
      const signal = args.signal as string
      const from = args.from as string
      const to = args.to as string
      const method = args.method as string
      if (!signal || !from || !to || !method) {
        throw new GodotMCPError(
          'signal, from, to, and method required',
          'INVALID_ARGS',
          'All four parameters are required.',
        )
      }

      const content = readFileSync(fullPath, 'utf-8')
      const lines = content.split('\n')
      const filtered = lines.filter((line) => {
        const trimmed = line.trim()
        if (!trimmed.startsWith('[connection')) return true
        return !(
          trimmed.includes(`signal="${signal}"`) &&
          trimmed.includes(`from="${from}"`) &&
          trimmed.includes(`to="${to}"`) &&
          trimmed.includes(`method="${method}"`)
        )
      })

      if (filtered.length === lines.length) {
        throw new GodotMCPError(
          'Connection not found',
          'SIGNAL_ERROR',
          'Check signal, from, to, and method parameters.',
        )
      }

      writeFileSync(fullPath, filtered.join('\n'), 'utf-8')
      return formatSuccess(`Disconnected: ${from}.${signal} -> ${to}.${method}()`)
    }

    default:
      throw new GodotMCPError(
        `Unknown action: ${action}`,
        'INVALID_ACTION',
        'Valid actions: list, connect, disconnect. Use help tool for full docs.',
      )
  }
}
