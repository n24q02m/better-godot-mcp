/**
 * Signals tool - Signal connection management in .tscn scenes
 * Actions: list | connect | disconnect
 */

import { readFile, writeFile } from 'node:fs/promises'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
import { safeResolve } from '../helpers/paths.js'
import { parseSceneContent } from '../helpers/scene-parser.js'

export async function handleSignals(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const projectPath = (args.project_path as string) || config.projectPath
  const scenePath = args.scene_path as string

  if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
  const fullPath = safeResolve(projectPath || process.cwd(), scenePath)

  async function readScene() {
    try {
      return await readFile(fullPath, 'utf-8')
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')
      }
      throw error
    }
  }

  switch (action) {
    case 'list': {
      const content = await readScene()
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

      let content = await readScene()

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

      await writeFile(fullPath, content, 'utf-8')
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

      const content = await readScene()
      let startIndex = 0
      let updatedContent = content
      let found = false

      // ⚡ Bolt: Instead of splitting the entire file into an array of lines (which is memory
      // and CPU intensive for large Godot scenes), we find and remove the connection line directly.
      while (startIndex !== -1) {
        startIndex = updatedContent.indexOf('[connection', startIndex)
        if (startIndex === -1) break
        let endIndex = updatedContent.indexOf('\n', startIndex)
        if (endIndex === -1) endIndex = updatedContent.length

        const line = updatedContent.slice(startIndex, endIndex)
        if (
          line.includes(`signal="${signal}"`) &&
          line.includes(`from="${from}"`) &&
          line.includes(`to="${to}"`) &&
          line.includes(`method="${method}"`)
        ) {
          found = true
          let removeStart = startIndex
          let removeEnd = endIndex

          // Try to remove the trailing newline to keep the file clean
          if (removeEnd < updatedContent.length && updatedContent[removeEnd] === '\n') {
            removeEnd++
            if (removeEnd < updatedContent.length && updatedContent[removeEnd] === '\r') {
              removeEnd++
            }
          } else if (removeStart > 0 && updatedContent[removeStart - 1] === '\n') {
            removeStart--
            if (removeStart > 0 && updatedContent[removeStart - 1] === '\r') {
              removeStart--
            }
          }

          updatedContent = updatedContent.slice(0, removeStart) + updatedContent.slice(removeEnd)
        } else {
          startIndex = endIndex
        }
      }

      if (!found) {
        throw new GodotMCPError(
          'Connection not found',
          'SIGNAL_ERROR',
          'Check signal, from, to, and method parameters.',
        )
      }

      await writeFile(fullPath, updatedContent, 'utf-8')
      return formatSuccess(`Disconnected: ${from}.${signal} -> ${to}.${method}()`)
    }

    default:
      throwUnknownAction(action, ['list', 'connect', 'disconnect'])
  }
}
