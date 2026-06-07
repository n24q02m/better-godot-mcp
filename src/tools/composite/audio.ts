/**
 * Audio tool - Audio bus and stream management
 * Actions: list_buses | add_bus | add_effect | create_stream
 */

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
import { pathExists, safeResolve } from '../helpers/paths.js'
import { validateNoNewlines } from '../helpers/security.js'

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
 * Handler for list_buses action.
 */
async function listBuses(projectPath: string | null | undefined, baseDir: string) {
  const busLayoutPath = resolveBusLayoutPath(projectPath, baseDir)

  if (!(await pathExists(busLayoutPath))) {
    return formatJSON({ buses: [{ name: 'Master', volume: 0, effects: [] }], note: 'Using default bus layout.' })
  }

  const content = await readFile(busLayoutPath, 'utf-8')
  const buses: { name: string; volume?: string; solo?: boolean; mute?: boolean }[] = []

  // Manual string scanning for buses
  let pos = 0
  while (pos < content.length) {
    const lineEnd = content.indexOf('\n', pos)
    const line = content.slice(pos, lineEnd === -1 ? undefined : lineEnd).trim()

    if (line.startsWith('bus/') && line.includes('/name')) {
      const eqIdx = line.indexOf('=')
      if (eqIdx !== -1) {
        const quoteStart = line.indexOf('"', eqIdx)
        const quoteEnd = line.lastIndexOf('"')
        if (quoteStart !== -1 && quoteEnd > quoteStart) {
          buses.push({ name: line.slice(quoteStart + 1, quoteEnd) })
        }
      }
    }

    if (lineEnd === -1) break
    pos = lineEnd + 1
  }

  if (buses.length === 0) buses.push({ name: 'Master' })
  return formatJSON({ buses })
}

/**
 * Handler for add_bus action.
 */
async function addBus(projectPath: string | null | undefined, baseDir: string, args: Record<string, unknown>) {
  const busLayoutPath = resolveBusLayoutPath(projectPath, baseDir)
  const busName = args.bus_name as string
  if (!busName) throw new GodotMCPError('No bus_name specified', 'INVALID_ARGS', 'Provide bus name.')
  const sendTo = (args.send_to as string) || 'Master'

  validateNoNewlines('Invalid characters in parameters', busName, sendTo)
  if (busName.includes('"') || sendTo.includes('"')) {
    throw new GodotMCPError('Invalid characters in parameters', 'INVALID_ARGS', 'Parameters must not contain quotes.')
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

  // Count existing buses using manual scanning
  let busCount = 0
  let pos = 0
  while (pos < content.length) {
    const lineEnd = content.indexOf('\n', pos)
    const line = content.slice(pos, lineEnd === -1 ? undefined : lineEnd).trim()
    if (line.startsWith('bus/') && line.includes('/name')) {
      busCount++
    }
    if (lineEnd === -1) break
    pos = lineEnd + 1
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

/**
 * Handler for add_effect action.
 */
async function addEffect(projectPath: string | null | undefined, baseDir: string, args: Record<string, unknown>) {
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

  validateNoNewlines('Invalid characters in parameters', busName, effectType)
  if (busName.includes('"') || effectType.includes('"')) {
    throw new GodotMCPError('Invalid characters in parameters', 'INVALID_ARGS', 'Parameters must not contain quotes.')
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

  // Find the target bus index using manual scanning
  let busIndex = -1
  let pos = 0
  while (pos < content.length) {
    const lineEnd = content.indexOf('\n', pos)
    const line = content.slice(pos, lineEnd === -1 ? undefined : lineEnd).trim()

    if (line.startsWith('bus/') && line.includes('/name')) {
      const eqIdx = line.indexOf('=')
      if (eqIdx !== -1) {
        const quoteStart = line.indexOf('"', eqIdx)
        const quoteEnd = line.lastIndexOf('"')
        if (quoteStart !== -1 && quoteEnd > quoteStart) {
          const currentBusName = line.slice(quoteStart + 1, quoteEnd)
          if (currentBusName === busName) {
            const parts = line.split('/')
            busIndex = Number.parseInt(parts[1], 10)
            break
          }
        }
      }
    }

    if (lineEnd === -1) break
    pos = lineEnd + 1
  }

  if (busIndex === -1) {
    throw new GodotMCPError(`Bus "${busName}" not found`, 'AUDIO_ERROR', 'Add the bus first with add_bus.')
  }

  // Count existing effects on this bus using manual scanning
  let effectCount = 0
  pos = 0
  const effectPrefix = `bus/${busIndex}/effect/`
  while (pos < content.length) {
    const lineEnd = content.indexOf('\n', pos)
    const line = content.slice(pos, lineEnd === -1 ? undefined : lineEnd).trim()
    if (line.startsWith(effectPrefix) && line.includes('/effect =')) {
      effectCount++
    }
    if (lineEnd === -1) break
    pos = lineEnd + 1
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
  const effectRef = `bus/${busIndex}/effect/${effectCount}/effect = SubResource("${subResId}")\nbus/${busIndex}/effect/${effectCount}/enabled = true\n`
  content = `${content.trimEnd()}\n${effectRef}`

  await writeFile(busLayoutPath, content, 'utf-8')
  return formatSuccess(`Added ${fullEffectType} to bus "${busName}" (effect index: ${effectCount})`)
}

/**
 * Handler for create_stream action.
 */
async function createStream(projectPath: string | null | undefined, args: Record<string, unknown>) {
  const scenePath = args.scene_path as string
  if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
  const nodeName = (args.name as string) || 'AudioStreamPlayer'
  const streamType = (args.stream_type as string) || '2D'
  const parent = (args.parent as string) || '.'
  const bus = (args.bus as string) || 'Master'

  validateNoNewlines('Invalid characters in parameters', nodeName, streamType, parent, bus)
  if (nodeName.includes('"') || streamType.includes('"') || parent.includes('"') || bus.includes('"')) {
    throw new GodotMCPError('Invalid characters in parameters', 'INVALID_ARGS', 'Parameters must not contain quotes.')
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

/**
 * Main handler for audio tool.
 */
export async function handleAudio(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const projectPath = (args.project_path as string) || config.projectPath
  const baseDir = config.projectPath || process.cwd()

  switch (action) {
    case 'list_buses':
      return listBuses(projectPath, baseDir)
    case 'add_bus':
      return addBus(projectPath, baseDir, args)
    case 'add_effect':
      return addEffect(projectPath, baseDir, args)
    case 'create_stream':
      return createStream(projectPath, args)
    default:
      throwUnknownAction(action, ['list_buses', 'add_bus', 'add_effect', 'create_stream'])
  }
}
