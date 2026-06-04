/**
 * Audio tool - Audio bus and stream management
 * Actions: list_buses | add_bus | add_effect | create_stream
 */

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
import { pathExists, safeResolve } from '../helpers/paths.js'

/**
 * Helper to resolve the default bus layout path.
 * Throws GodotMCPError if project path is missing.
 */
function resolveBusLayoutPath(projectPath: string | null | undefined, baseDir: string): string {
  if (!projectPath) {
    throw new GodotMCPError('No project path specified', 'INVALID_ARGS', 'Provide project_path.')
  }
  return join(safeResolve(baseDir, projectPath), 'default_bus_layout.tres')
}

export async function handleAudio(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const projectPath = (args.project_path as string) || config.projectPath
  const baseDir = config.projectPath || process.cwd()

  switch (action) {
    case 'list_buses': {
      const busLayoutPath = resolveBusLayoutPath(projectPath, baseDir)

      if (!(await pathExists(busLayoutPath))) {
        return formatJSON({ buses: [{ name: 'Master', volume: 0, effects: [] }], note: 'Using default bus layout.' })
      }

      const content = await readFile(busLayoutPath, 'utf-8')
      const buses: { name: string; volume?: string; solo?: boolean; mute?: boolean }[] = []

      // Parse bus entries manually to avoid regex allocations
      let pos = 0
      const len = content.length
      while (pos < len) {
        const nextNewline = content.indexOf('\n', pos)
        const lineEnd = nextNewline === -1 ? len : nextNewline

        let start = pos
        while (start < lineEnd && content.charCodeAt(start) <= 32) start++

        if (content.startsWith('bus/', start)) {
          const nameIdx = content.indexOf('/name', start)
          if (nameIdx !== -1 && nameIdx < lineEnd) {
            const eqIdx = content.indexOf('=', nameIdx)
            if (eqIdx !== -1 && eqIdx < lineEnd) {
              const valStart = content.indexOf('"', eqIdx)
              if (valStart !== -1 && valStart < lineEnd) {
                const valEnd = content.indexOf('"', valStart + 1)
                if (valEnd !== -1 && valEnd < lineEnd) {
                  buses.push({ name: content.slice(valStart + 1, valEnd) })
                }
              }
            }
          }
        }
        pos = nextNewline === -1 ? len : nextNewline + 1
      }

      if (buses.length === 0) buses.push({ name: 'Master' })
      return formatJSON({ buses })
    }

    case 'add_bus': {
      const busLayoutPath = resolveBusLayoutPath(projectPath, baseDir)
      const busName = args.bus_name as string
      if (!busName) throw new GodotMCPError('No bus_name specified', 'INVALID_ARGS', 'Provide bus name.')
      const sendTo = (args.send_to as string) || 'Master'

      if (
        busName.includes('"') ||
        busName.includes('\n') ||
        busName.includes('\r') ||
        sendTo.includes('"') ||
        sendTo.includes('\n') ||
        sendTo.includes('\r')
      ) {
        throw new GodotMCPError(
          'Invalid characters in parameters',
          'INVALID_ARGS',
          'Parameters must not contain quotes or newlines.',
        )
      }

      let content: string

      if (await pathExists(busLayoutPath)) {
        content = await readFile(busLayoutPath, 'utf-8')
      } else {
        content = [
          '[gd_resource type="AudioBusLayout" format=3]',
          '',
          '[resource]',
          'bus/0/name = "Master"',
          'bus/0/solo = false',
          'bus/0/mute = false',
          'bus/0/bypass_fx = false',
          'bus/0/volume_db = 0.0',
          '',
        ].join('\n')
      }

      // Count existing buses manually
      let busCount = 0
      let searchPos = 0
      while (true) {
        const idx = content.indexOf('/name', searchPos)
        if (idx === -1) break
        let i = idx - 1
        while (i >= 0 && content.charCodeAt(i) >= 48 && content.charCodeAt(i) <= 57) i--
        if (i >= 3 && content.charCodeAt(i) === 47 && content.substring(i - 3, i) === 'bus') {
          busCount++
        }
        searchPos = idx + 5
      }

      const newBus = [
        `bus/${busCount}/name = "${busName}"`,
        `bus/${busCount}/solo = false`,
        `bus/${busCount}/mute = false`,
        `bus/${busCount}/bypass_fx = false`,
        `bus/${busCount}/volume_db = 0.0`,
        `bus/${busCount}/send = "${sendTo}"`,
      ].join('\n')

      content = `${content.trimEnd()}\n${newBus}\n`
      await writeFile(busLayoutPath, content, 'utf-8')

      return formatSuccess(`Added audio bus: ${busName} (send to: ${sendTo})`)
    }

    case 'add_effect': {
      const busLayoutPath = resolveBusLayoutPath(projectPath, baseDir)
      const busName = args.bus_name as string
      const effectType = args.effect_type as string
      if (!busName || !effectType) {
        throw new GodotMCPError(
          'bus_name and effect_type required',
          'INVALID_ARGS',
          'Provide bus name and effect type (e.g., "Reverb", "Compressor", "Limiter", "EQ").',
        )
      }

      if (
        busName.includes('"') ||
        busName.includes('\n') ||
        busName.includes('\r') ||
        effectType.includes('"') ||
        effectType.includes('\n') ||
        effectType.includes('\r')
      ) {
        throw new GodotMCPError(
          'Invalid characters in parameters',
          'INVALID_ARGS',
          'Parameters must not contain quotes or newlines.',
        )
      }

      // Normalize effect type name (allow shorthand like "Reverb" -> "AudioEffectReverb")
      const fullEffectType = effectType.startsWith('AudioEffect') ? effectType : `AudioEffect${effectType}`

      let content: string

      if (await pathExists(busLayoutPath)) {
        content = await readFile(busLayoutPath, 'utf-8')
      } else {
        content = [
          '[gd_resource type="AudioBusLayout" format=3]',
          '',
          '[resource]',
          'bus/0/name = "Master"',
          'bus/0/solo = false',
          'bus/0/mute = false',
          'bus/0/bypass_fx = false',
          'bus/0/volume_db = 0.0',
          '',
        ].join('\n')
      }

      // Find the target bus index manually
      let busIndex = -1
      let searchPos = 0
      const contentLen = content.length
      while (searchPos < contentLen) {
        const nextNewline = content.indexOf('\n', searchPos)
        const lineEnd = nextNewline === -1 ? contentLen : nextNewline

        let start = searchPos
        while (start < lineEnd && content.charCodeAt(start) <= 32) start++

        if (content.startsWith('bus/', start)) {
          const nameIdx = content.indexOf('/name', start)
          if (nameIdx !== -1 && nameIdx < lineEnd) {
            const eqIdx = content.indexOf('=', nameIdx)
            if (eqIdx !== -1 && eqIdx < lineEnd) {
              const valStart = content.indexOf('"', eqIdx)
              if (valStart !== -1 && valStart < lineEnd) {
                const valEnd = content.indexOf('"', valStart + 1)
                if (valEnd !== -1 && valEnd < lineEnd) {
                  const currentName = content.slice(valStart + 1, valEnd)
                  if (currentName === busName) {
                    const indexStr = content.slice(start + 4, nameIdx)
                    busIndex = Number.parseInt(indexStr, 10)
                    break
                  }
                }
              }
            }
          }
        }
        searchPos = nextNewline === -1 ? contentLen : nextNewline + 1
      }
      if (busIndex === -1) {
        throw new GodotMCPError(`Bus "${busName}" not found`, 'AUDIO_ERROR', 'Add the bus first with add_bus.')
      }

      // Count existing effects on this bus manually
      const effectPrefix = `bus/${busIndex}/effect/`
      const effectSuffix = '/effect'
      let effectIndex = 0
      let effSearchPos = 0
      while (true) {
        const prefixIdx = content.indexOf(effectPrefix, effSearchPos)
        if (prefixIdx === -1) break
        const suffixIdx = content.indexOf(effectSuffix, prefixIdx + effectPrefix.length)
        if (suffixIdx !== -1) {
          const nextNewline = content.indexOf('\n', prefixIdx)
          if (nextNewline === -1 || nextNewline > suffixIdx) {
            effectIndex++
          }
        }
        effSearchPos = prefixIdx + effectPrefix.length
      }

      // Generate unique sub_resource id
      const subResId = `${fullEffectType}_${Date.now()}`

      // Insert sub_resource before [resource] section
      const resourceIdx = content.indexOf('[resource]')
      const subResource = `[sub_resource type="${fullEffectType}" id="${subResId}"]\n\n`
      if (resourceIdx !== -1) {
        content = `${content.slice(0, resourceIdx)}${subResource}${content.slice(resourceIdx)}`
      } else {
        content += `\n${subResource}`
      }

      // Add effect reference to the bus
      const effectRef = `bus/${busIndex}/effect/${effectIndex}/effect = SubResource("${subResId}")\nbus/${busIndex}/effect/${effectIndex}/enabled = true\n`
      content = `${content.trimEnd()}\n${effectRef}`

      await writeFile(busLayoutPath, content, 'utf-8')
      return formatSuccess(`Added ${fullEffectType} to bus "${busName}" (effect index: ${effectIndex})`)
    }

    case 'create_stream': {
      const scenePath = args.scene_path as string
      if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
      const nodeName = (args.name as string) || 'AudioStreamPlayer'
      const streamType = (args.stream_type as string) || '2D'
      const parent = (args.parent as string) || '.'
      const bus = (args.bus as string) || 'Master'

      if (
        nodeName.includes('"') ||
        nodeName.includes('\n') ||
        nodeName.includes('\r') ||
        streamType.includes('"') ||
        streamType.includes('\n') ||
        streamType.includes('\r') ||
        parent.includes('"') ||
        parent.includes('\n') ||
        parent.includes('\r') ||
        bus.includes('"') ||
        bus.includes('\n') ||
        bus.includes('\r')
      ) {
        throw new GodotMCPError(
          'Invalid characters in parameters',
          'INVALID_ARGS',
          'Parameters must not contain quotes or newlines.',
        )
      }

      const fullPath = safeResolve(projectPath || process.cwd(), scenePath)
      if (!(await pathExists(fullPath)))
        throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check file path.')

      let content = await readFile(fullPath, 'utf-8')
      const nodeType =
        streamType === '3D' ? 'AudioStreamPlayer3D' : streamType === '2D' ? 'AudioStreamPlayer2D' : 'AudioStreamPlayer'
      const parentAttr = parent === '.' ? '' : ` parent="${parent}"`
      const nodeDecl = `\n[node name="${nodeName}" type="${nodeType}"${parentAttr}]\nbus = "${bus}"\n`
      content = `${content.trimEnd()}\n${nodeDecl}`

      await writeFile(fullPath, content, 'utf-8')
      return formatSuccess(`Created ${nodeType}: ${nodeName} (bus: ${bus})`)
    }

    default:
      throwUnknownAction(action, ['list_buses', 'add_bus', 'add_effect', 'create_stream'])
  }
}
