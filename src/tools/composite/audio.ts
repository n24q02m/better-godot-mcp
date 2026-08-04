/**
 * Audio tool - Audio bus and stream management
 * Actions: list_buses | add_bus | add_effect | create_stream
 */

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
import { resolveProjectRoot, safeResolve } from '../helpers/paths.js'
import { validateStringArguments } from '../helpers/security.js'

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

/**
 * Efficiently scan for bus entries in an AudioBusLayout (.tres) file.
 * Format: bus/INDEX/name = "NAME"
 */
function* scanBuses(content: string): Generator<{ index: number; name: string }> {
  const search = 'bus/'
  let pos = 0
  while (true) {
    pos = content.indexOf(search, pos)
    if (pos === -1) break

    const indexStart = pos + search.length
    const slashIdx = content.indexOf('/', indexStart)
    if (slashIdx === -1) {
      pos = indexStart
      continue
    }

    const indexStr = content.slice(indexStart, slashIdx)
    const index = Number.parseInt(indexStr, 10)
    if (Number.isNaN(index)) {
      pos = indexStart
      continue
    }

    const nameKey = '/name'
    if (!content.startsWith(nameKey, slashIdx)) {
      pos = indexStart
      continue
    }

    const eqIdx = content.indexOf('=', slashIdx + nameKey.length)
    if (eqIdx === -1) {
      pos = indexStart
      continue
    }

    const quoteStart = content.indexOf('"', eqIdx)
    if (quoteStart === -1) {
      pos = indexStart
      continue
    }

    const quoteEnd = content.indexOf('"', quoteStart + 1)
    if (quoteEnd === -1) {
      pos = indexStart
      continue
    }

    yield { index, name: content.slice(quoteStart + 1, quoteEnd) }
    pos = quoteEnd + 1
  }
}

export async function handleAudio(action: string, args: Record<string, unknown>, config: GodotConfig) {
  validateStringArguments(undefined, args.project_path)
  const projectPath = (args.project_path ?? config.projectPath) as string | undefined
  const baseDir = config.projectPath || process.cwd()

  switch (action) {
    case 'list_buses': {
      const busLayoutPath = resolveBusLayoutPath(projectPath, baseDir)

      let content: string
      try {
        content = await readFile(busLayoutPath, 'utf-8')
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          return formatJSON({ buses: [{ name: 'Master', volume: 0, effects: [] }], note: 'Using default bus layout.' })
        }
        throw err
      }

      const buses: { name: string; volume?: string; solo?: boolean; mute?: boolean }[] = []

      // Parse bus entries
      for (const { name } of scanBuses(content)) {
        buses.push({ name })
      }

      if (buses.length === 0) buses.push({ name: 'Master' })
      return formatJSON({ buses })
    }

    case 'add_bus': {
      const busLayoutPath = resolveBusLayoutPath(projectPath, baseDir)
      const busName = args.bus_name as string
      if (!busName) throw new GodotMCPError('No bus_name specified', 'INVALID_ARGS', 'Provide bus name.')
      const rawSendTo = args.send_to
      validateStringArguments('Invalid characters in parameters', busName, rawSendTo)
      const sendTo = (rawSendTo ?? 'Master') as string

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
      try {
        content = await readFile(busLayoutPath, 'utf-8')
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
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

      // Count existing buses
      let busCount = 0
      for (const _ of scanBuses(content)) {
        busCount++
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
      validateStringArguments('Invalid characters in parameters', busName, effectType)

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
      try {
        content = await readFile(busLayoutPath, 'utf-8')
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
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

      // Find the target bus index
      let busIndex = -1
      for (const bus of scanBuses(content)) {
        if (bus.name === busName) {
          busIndex = bus.index
          break
        }
      }
      if (busIndex === -1) {
        throw new GodotMCPError(`Bus "${busName}" not found`, 'AUDIO_ERROR', 'Add the bus first with add_bus.')
      }

      // Count existing effects on this bus
      let effectIndex = 0
      while (content.includes(`bus/${busIndex}/effect/${effectIndex}/effect`)) {
        effectIndex++
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
      const rawNodeName = args.name
      const rawStreamType = args.stream_type
      const rawParent = args.parent
      const rawBus = args.bus
      validateStringArguments('Invalid characters in parameters', rawNodeName, rawStreamType, rawParent, rawBus)
      const nodeName = (rawNodeName ?? 'AudioStreamPlayer') as string
      const streamType = (rawStreamType ?? '2D') as string
      const parent = (rawParent ?? '.') as string
      const bus = (rawBus ?? 'Master') as string

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

      // Confine caller project_path to the trusted base before resolving the scene.
      const fullPath = safeResolve(resolveProjectRoot(args.project_path, config.projectPath), scenePath)
      let content: string
      try {
        content = await readFile(fullPath, 'utf-8')
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check file path.')
        }
        throw err
      }

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
