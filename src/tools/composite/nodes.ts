/**
 * Nodes tool - Scene node manipulation
 * Actions: add | remove | rename | list | set_property | get_property
 */

import { readFile, writeFile } from 'node:fs/promises'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
import { safeResolve } from '../helpers/paths.js'
import {
  getNodeProperty,
  parseSceneContent,
  removeNodeFromContent,
  renameNodeInContent,
  setNodePropertyInContent,
} from '../helpers/scene-parser.js'
import { validateStringArguments } from '../helpers/security.js'

// ⚡ Bolt: Pre-compile regular expressions to avoid recreation in hot paths
const ROOT_PATH_REGEX = /^\/?root\/(.+)$/i

function resolveScenePath(projectPath: string, scenePath: string): string {
  return safeResolve(projectPath, scenePath)
}

// ⚡ Bolt: Using try-to-perform instead of pathExists to reduce redundant I/O calls
async function readSceneFile(fullPath: string, scenePath: string): Promise<string> {
  try {
    return await readFile(fullPath, 'utf-8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')
    }
    throw error
  }
}

/**
 * Normalize node path: strip common LLM mistakes like "/root/SceneName/" prefix.
 * Handles backslashes, case-insensitivity, and absolute vs relative paths.
 * Returns the corrected path and whether it was auto-corrected.
 */
function normalizeNodePath(path: string): { path: string; corrected: boolean } {
  if (!path || path === '.') return { path, corrected: false }

  // Normalize backslashes to forward slashes
  const normalized = path.replace(/\\/g, '/')
  const corrected = path.includes('\\')

  // Case-insensitive check for /root/ or root/ prefix
  // These are common LLM mistakes when they try to use absolute paths.
  const rootMatch = ROOT_PATH_REGEX.exec(normalized)
  if (rootMatch) {
    const afterRoot = rootMatch[1]
    const segments = afterRoot.split('/').filter(Boolean)
    if (segments.length <= 1) {
      return { path: '.', corrected: true }
    }
    const remaining = segments.slice(1).join('/')
    return { path: remaining, corrected: true }
  }

  // Handle /root or root (exact match)
  // We only treat it as the scene root if it's explicitly "/root" or "root" (case-insensitive)
  // But wait, if someone has a node named "Root" that is NOT the scene root?
  // In Godot, the root of the scene being edited is often named after the scene or "Root".
  // LLMs often use "/root/SceneName/..."
  if (normalized.toLowerCase() === '/root') {
    return { path: '.', corrected: true }
  }

  // Strip leading slash
  if (normalized.startsWith('/')) {
    return { path: normalized.slice(1), corrected: true }
  }

  return { path: normalized, corrected }
}

async function handleAddNode(projectPath: string, args: Record<string, unknown>) {
  const scenePath = args.scene_path as string
  if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
  const nodeName = args.name as string
  if (!nodeName) throw new GodotMCPError('No node name specified', 'INVALID_ARGS', 'Provide name for the new node.')
  validateStringArguments('Invalid node name', nodeName)

  if (nodeName.includes('"') || nodeName.includes('\n') || nodeName.includes('\r')) {
    throw new GodotMCPError('Invalid node name', 'INVALID_ARGS', 'Node name must not contain quotes or newlines.')
  }

  const rawNodeType = args.type
  validateStringArguments('Invalid node type', rawNodeType)
  const nodeType = (rawNodeType as string | null | undefined) ?? 'Node'
  if (nodeType.includes('"') || nodeType.includes('\n') || nodeType.includes('\r')) {
    throw new GodotMCPError('Invalid node type', 'INVALID_ARGS', 'Node type must not contain quotes or newlines.')
  }

  const rawParentArgument = args.parent
  validateStringArguments('Invalid parent path', rawParentArgument)
  const rawParent = (rawParentArgument as string | null | undefined) ?? '.'
  const { path: parent } = normalizeNodePath(rawParent)
  if (parent.includes('"') || parent.includes('\n') || parent.includes('\r')) {
    throw new GodotMCPError('Invalid parent path', 'INVALID_ARGS', 'Parent path must not contain quotes or newlines.')
  }

  const fullPath = resolveScenePath(projectPath, scenePath)
  let content: string
  try {
    content = await readFile(fullPath, 'utf-8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Create the scene first.')
    }
    throw error
  }
  const scene = parseSceneContent(content)
  const duplicate = scene.nodesByPath.get(`${parent}:${nodeName}`)
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
  const rawName = args.name
  validateStringArguments('Invalid node name', rawName)
  if (!rawName) throw new GodotMCPError('No node name specified', 'INVALID_ARGS', 'Provide name of node to remove.')
  const { path: nodeName } = normalizeNodePath(rawName as string)

  const fullPath = resolveScenePath(projectPath, scenePath)
  const content = await readSceneFile(fullPath, scenePath)
  const updated = removeNodeFromContent(content, nodeName)
  await writeFile(fullPath, updated, 'utf-8')

  return formatSuccess(`Removed node: ${nodeName} from ${scenePath}`)
}

async function handleRenameNode(projectPath: string, args: Record<string, unknown>) {
  const scenePath = args.scene_path as string
  if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
  const rawName = args.name
  validateStringArguments('Invalid node name', rawName)
  const { path: nodeName } = normalizeNodePath((rawName as string | null | undefined) ?? '')
  const newName = args.new_name as string
  if (!nodeName || !newName)
    throw new GodotMCPError('Both name and new_name required', 'INVALID_ARGS', 'Provide name and new_name.')
  validateStringArguments('Invalid node name', newName)

  if (newName.includes('"') || newName.includes('\n') || newName.includes('\r')) {
    throw new GodotMCPError('Invalid node name', 'INVALID_ARGS', 'New node name must not contain quotes or newlines.')
  }

  const fullPath = resolveScenePath(projectPath, scenePath)
  const content = await readSceneFile(fullPath, scenePath)
  const updated = renameNodeInContent(content, nodeName, newName)
  await writeFile(fullPath, updated, 'utf-8')

  return formatSuccess(`Renamed node: ${nodeName} -> ${newName} in ${scenePath}`)
}

async function handleListNodes(projectPath: string, args: Record<string, unknown>) {
  const scenePath = args.scene_path as string
  if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')

  const fullPath = resolveScenePath(projectPath, scenePath)
  const content = await readSceneFile(fullPath, scenePath)
  const scene = parseSceneContent(content)
  // ⚡ Bolt: Removed double .map() passes and expensive object spread (...node.properties) in mapToSceneNode.
  // ⚡ Bolt: Pre-allocate array to avoid dynamic resizing overhead for scenes with many nodes.
  const nodes = new Array(scene.nodes.length)
  for (let i = 0; i < scene.nodes.length; i++) {
    const n = scene.nodes[i]
    nodes[i] = {
      name: n.name,
      type: n.type || 'Node',
      parent: n.parent || '(root)',
      hasScript: !!n.properties.script,
    }
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
  const rawName = args.name
  validateStringArguments('Invalid node name', rawName)
  const { path: nodeName } = normalizeNodePath((rawName as string | null | undefined) ?? '')
  const property = args.property as string
  const rawValue = args.value
  if (!nodeName || !property || rawValue === undefined) {
    throw new GodotMCPError('name, property, and value required', 'INVALID_ARGS', 'Provide name, property, and value.')
  }
  validateStringArguments('Invalid property key', property)
  validateStringArguments('Invalid property value', rawValue)
  if (rawValue === null) {
    throw new GodotMCPError('Invalid property value', 'INVALID_ARGS')
  }
  const value = rawValue as string

  if (property.includes('=') || property.includes('\n') || property.includes('\r')) {
    throw new GodotMCPError('Invalid property key', 'INVALID_ARGS', 'Property keys must not contain "=", newlines.')
  }
  if (value.includes('\n') || value.includes('\r')) {
    throw new GodotMCPError('Invalid property value', 'INVALID_ARGS', 'Property values must not contain newlines.')
  }

  const fullPath = resolveScenePath(projectPath, scenePath)
  const content = await readSceneFile(fullPath, scenePath)
  const updated = setNodePropertyInContent(content, nodeName, property, value)
  await writeFile(fullPath, updated, 'utf-8')

  return formatSuccess(`Set ${property} = ${value} on node ${nodeName}`)
}

async function handleGetNodeProperty(projectPath: string, args: Record<string, unknown>) {
  const scenePath = args.scene_path as string
  if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
  const rawName = args.name
  validateStringArguments('Invalid node name', rawName)
  const { path: nodeName } = normalizeNodePath((rawName as string | null | undefined) ?? '')
  const property = args.property as string
  if (!nodeName || !property) {
    throw new GodotMCPError('name and property required', 'INVALID_ARGS', 'Provide name and property.')
  }

  const fullPath = resolveScenePath(projectPath, scenePath)
  const content = await readSceneFile(fullPath, scenePath)
  const scene = parseSceneContent(content)
  const val = getNodeProperty(scene, nodeName, property)

  return formatJSON({ node: nodeName, property, value: val ?? null })
}

const NODE_ACTIONS: Record<
  string,
  (
    projectPath: string,
    args: Record<string, unknown>,
  ) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>
> = {
  add: handleAddNode,
  remove: handleRemoveNode,
  rename: handleRenameNode,
  list: handleListNodes,
  set_property: handleSetNodeProperty,
  get_property: handleGetNodeProperty,
}

export async function handleNodes(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const baseProjectPath = config.projectPath || process.cwd()
  const projectPath = args.project_path ? safeResolve(baseProjectPath, args.project_path as string) : baseProjectPath

  if (Object.hasOwn(NODE_ACTIONS, action)) {
    const handler = NODE_ACTIONS[action]
    if (handler) {
      return handler(projectPath, args)
    }
  }

  throwUnknownAction(action, Object.keys(NODE_ACTIONS))
}
