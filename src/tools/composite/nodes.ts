/**
 * Nodes tool - Scene node manipulation
 * Actions: add | remove | rename | list | set_property | get_property
 */

import { readFile, writeFile } from 'node:fs/promises'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
import { pathExists, safeResolve } from '../helpers/paths.js'
import {
  getNodeProperty,
  parseSceneContent,
  removeNodeFromContent,
  renameNodeInContent,
  setNodePropertyInContent,
} from '../helpers/scene-parser.js'

function resolveScenePath(projectPath: string, scenePath: string): string {
  return safeResolve(projectPath, scenePath)
}

/**
 * Normalize node path: strip common LLM mistakes like "/root/SceneName/" prefix.
 * Returns the corrected path and whether it was auto-corrected.
 */
function normalizeNodePath(path: string): { path: string; corrected: boolean } {
  if (!path || path === '.') return { path, corrected: false }
  // Strip /root/ or /root/SceneName/ prefix that LLMs commonly generate
  const rootMatch = path.match(/^\/root\/(?:[^/]+\/)?(.+)$/)
  if (rootMatch) {
    return { path: rootMatch[1], corrected: true }
  }
  // Strip leading slash
  if (path.startsWith('/')) {
    return { path: path.slice(1), corrected: false }
  }
  return { path, corrected: false }
}

async function handleAddNode(projectPath: string, args: Record<string, unknown>) {
  const scenePath = args.scene_path as string
  if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
  const nodeName = args.name as string
  if (!nodeName) throw new GodotMCPError('No node name specified', 'INVALID_ARGS', 'Provide name for the new node.')

  if (nodeName.includes('"') || nodeName.includes('\n') || nodeName.includes('\r')) {
    throw new GodotMCPError('Invalid node name', 'INVALID_ARGS', 'Node name must not contain quotes or newlines.')
  }

  const nodeType = (args.type as string) || 'Node'
  if (nodeType.includes('"') || nodeType.includes('\n') || nodeType.includes('\r')) {
    throw new GodotMCPError('Invalid node type', 'INVALID_ARGS', 'Node type must not contain quotes or newlines.')
  }

  const rawParent = (args.parent as string) || '.'
  const { path: parent } = normalizeNodePath(rawParent)
  if (parent.includes('"') || parent.includes('\n') || parent.includes('\r')) {
    throw new GodotMCPError('Invalid parent path', 'INVALID_ARGS', 'Parent path must not contain quotes or newlines.')
  }

  const fullPath = resolveScenePath(projectPath, scenePath)
  if (!(await pathExists(fullPath)))
    throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Create the scene first.')

  const content = await readFile(fullPath, 'utf-8')
  const scene = parseSceneContent(content)
  const duplicate = scene.nodes.find((n) => n.name === nodeName && (n.parent || '.') === parent)
  if (duplicate) {
    throw new GodotMCPError(
      `Node "${nodeName}" already exists under parent "${parent}"`,
      'NODE_ERROR',
      'Use a different name.',
    )
  }

  const parentAttr = parent === '.' ? '' : ` parent="${parent}"`
  let nodeDecl = `\n[node name="${nodeName}" type="${nodeType}"${parentAttr}]\n`

  // Handle properties parsing
  if (args.properties !== undefined) {
    if (typeof args.properties !== 'object' || args.properties === null || Array.isArray(args.properties)) {
      throw new GodotMCPError(
        'Invalid properties format',
        'INVALID_ARGS',
        'properties must be an object with string keys and values.',
      )
    }
    for (const [key, value] of Object.entries(args.properties)) {
      if (typeof key !== 'string' || typeof value !== 'string') {
        throw new GodotMCPError('Invalid property value', 'INVALID_ARGS', 'Property keys and values must be strings.')
      }
      if (key.includes('=') || key.includes('\n') || key.includes('\r')) {
        throw new GodotMCPError('Invalid property key', 'INVALID_ARGS', 'Property keys must not contain "=", newlines.')
      }
      if (value.includes('\n') || value.includes('\r')) {
        throw new GodotMCPError('Invalid property value', 'INVALID_ARGS', 'Property values must not contain newlines.')
      }
      nodeDecl += `${key} = ${value}\n`
    }
  }

  const updated = `${content.trimEnd()}\n${nodeDecl}`
  await writeFile(fullPath, updated, 'utf-8')

  return formatSuccess(`Added node: ${nodeName} (${nodeType}) under ${parent}`)
}

async function handleRemoveNode(projectPath: string, args: Record<string, unknown>) {
  const scenePath = args.scene_path as string
  if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
  const rawName = args.name as string
  if (!rawName) throw new GodotMCPError('No node name specified', 'INVALID_ARGS', 'Provide name of node to remove.')
  const { path: nodeName } = normalizeNodePath(rawName)

  const fullPath = resolveScenePath(projectPath, scenePath)
  if (!(await pathExists(fullPath)))
    throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')

  const content = await readFile(fullPath, 'utf-8')
  const updated = removeNodeFromContent(content, nodeName)
  await writeFile(fullPath, updated, 'utf-8')

  return formatSuccess(`Removed node: ${nodeName} from ${scenePath}`)
}

async function handleRenameNode(projectPath: string, args: Record<string, unknown>) {
  const scenePath = args.scene_path as string
  if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
  const { path: nodeName } = normalizeNodePath((args.name as string) || '')
  const newName = args.new_name as string
  if (!nodeName || !newName)
    throw new GodotMCPError('Both name and new_name required', 'INVALID_ARGS', 'Provide name and new_name.')

  if (newName.includes('"') || newName.includes('\n') || newName.includes('\r')) {
    throw new GodotMCPError('Invalid node name', 'INVALID_ARGS', 'New node name must not contain quotes or newlines.')
  }

  const fullPath = resolveScenePath(projectPath, scenePath)
  if (!(await pathExists(fullPath)))
    throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')

  const content = await readFile(fullPath, 'utf-8')
  const updated = renameNodeInContent(content, nodeName, newName)
  await writeFile(fullPath, updated, 'utf-8')

  return formatSuccess(`Renamed node: ${nodeName} -> ${newName} in ${scenePath}`)
}

async function handleListNodes(projectPath: string, args: Record<string, unknown>) {
  const scenePath = args.scene_path as string
  if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')

  const fullPath = resolveScenePath(projectPath, scenePath)
  if (!(await pathExists(fullPath)))
    throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')

  const content = await readFile(fullPath, 'utf-8')
  const scene = parseSceneContent(content)
  // ⚡ Bolt: Removed double .map() passes and expensive object spread (...node.properties) in mapToSceneNode.
  // Iterating scene.nodes directly in a single pass reduces O(N) allocation overhead for scenes with many nodes.
  const nodes = []
  for (const n of scene.nodes) {
    nodes.push({
      name: n.name,
      type: n.type || 'Node',
      parent: n.parent || '(root)',
      hasScript: !!n.properties.script,
    })
  }

  return formatJSON({
    scene: scenePath,
    nodeCount: scene.nodes.length,
    nodes,
  })
}

async function handleSetNodeProperty(projectPath: string, args: Record<string, unknown>) {
  const scenePath = args.scene_path as string
  if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
  const { path: nodeName } = normalizeNodePath((args.name as string) || '')
  const property = args.property as string
  const value = args.value as string
  if (!nodeName || !property || value === undefined) {
    throw new GodotMCPError('name, property, and value required', 'INVALID_ARGS', 'Provide name, property, and value.')
  }

  if (property.includes('=') || property.includes('\n') || property.includes('\r')) {
    throw new GodotMCPError('Invalid property key', 'INVALID_ARGS', 'Property keys must not contain "=", newlines.')
  }
  if (value.includes('\n') || value.includes('\r')) {
    throw new GodotMCPError('Invalid property value', 'INVALID_ARGS', 'Property values must not contain newlines.')
  }

  const fullPath = resolveScenePath(projectPath, scenePath)
  if (!(await pathExists(fullPath)))
    throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')

  const content = await readFile(fullPath, 'utf-8')
  const updated = setNodePropertyInContent(content, nodeName, property, value)
  await writeFile(fullPath, updated, 'utf-8')

  return formatSuccess(`Set ${property} = ${value} on node ${nodeName}`)
}

async function handleGetNodeProperty(projectPath: string, args: Record<string, unknown>) {
  const scenePath = args.scene_path as string
  if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
  const { path: nodeName } = normalizeNodePath((args.name as string) || '')
  const property = args.property as string
  if (!nodeName || !property) {
    throw new GodotMCPError('name and property required', 'INVALID_ARGS', 'Provide name and property.')
  }

  const fullPath = resolveScenePath(projectPath, scenePath)
  if (!(await pathExists(fullPath)))
    throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')

  const content = await readFile(fullPath, 'utf-8')
  const scene = parseSceneContent(content)
  const val = getNodeProperty(scene, nodeName, property)

  return formatJSON({ node: nodeName, property, value: val ?? null })
}

export async function handleNodes(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const baseProjectPath = config.projectPath || process.cwd()
  const projectPath = args.project_path ? safeResolve(baseProjectPath, args.project_path as string) : baseProjectPath

  switch (action) {
    case 'add':
      return handleAddNode(projectPath, args)
    case 'remove':
      return handleRemoveNode(projectPath, args)
    case 'rename':
      return handleRenameNode(projectPath, args)
    case 'list':
      return handleListNodes(projectPath, args)
    case 'set_property':
      return handleSetNodeProperty(projectPath, args)
    case 'get_property':
      return handleGetNodeProperty(projectPath, args)
    default:
      throwUnknownAction(action, ['add', 'remove', 'rename', 'list', 'set_property', 'get_property'])
  }
}
