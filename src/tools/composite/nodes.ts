/**
 * Nodes tool - Scene node manipulation
 * Actions: add | remove | rename | list | set_property | get_property
 */

import { readFile, writeFile } from 'node:fs/promises'
import type { GodotConfig, SceneNode } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
import { pathExists, safeResolve } from '../helpers/paths.js'
import {
  getNodeProperty,
  parseSceneContent,
  removeNodeFromContent,
  renameNodeInContent,
  type SceneNodeInfo,
  setNodePropertyInContent,
} from '../helpers/scene-parser.js'

/**
 * Map scene-parser's SceneNodeInfo to internal SceneNode format
 */
function mapToSceneNode(node: SceneNodeInfo): SceneNode {
  const properties = { ...node.properties }
  let script: string | null = null

  if (properties.script) {
    script = properties.script
    delete properties.script
  }

  return {
    name: node.name,
    type: node.type || 'Node',
    parent: node.parent || null,
    properties,
    script,
  }
}

function resolveScenePath(projectPath: string, scenePath: string): string {
  return safeResolve(projectPath, scenePath)
}

export async function handleNodes(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const baseProjectPath = config.projectPath || process.cwd()
  const projectPath = args.project_path ? safeResolve(baseProjectPath, args.project_path as string) : baseProjectPath

  switch (action) {
    case 'add': {
      const scenePath = args.scene_path as string
      if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
      const nodeName = args.name as string
      if (!nodeName) throw new GodotMCPError('No node name specified', 'INVALID_ARGS', 'Provide name for the new node.')
      const nodeType = (args.type as string) || 'Node'
      const parent = (args.parent as string) || '.'

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
            throw new GodotMCPError(
              'Invalid property value',
              'INVALID_ARGS',
              'Property keys and values must be strings.',
            )
          }
          nodeDecl += `${key} = ${value}\n`
        }
      }

      const updated = `${content.trimEnd()}\n${nodeDecl}`
      await writeFile(fullPath, updated, 'utf-8')

      return formatSuccess(`Added node: ${nodeName} (${nodeType}) under ${parent}`)
    }

    case 'remove': {
      const scenePath = args.scene_path as string
      if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
      const nodeName = args.name as string
      if (!nodeName)
        throw new GodotMCPError('No node name specified', 'INVALID_ARGS', 'Provide name of node to remove.')

      const fullPath = resolveScenePath(projectPath, scenePath)
      if (!(await pathExists(fullPath)))
        throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')

      const content = await readFile(fullPath, 'utf-8')
      const updated = removeNodeFromContent(content, nodeName)
      await writeFile(fullPath, updated, 'utf-8')

      return formatSuccess(`Removed node: ${nodeName} from ${scenePath}`)
    }

    case 'rename': {
      const scenePath = args.scene_path as string
      if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
      const nodeName = args.name as string
      const newName = args.new_name as string
      if (!nodeName || !newName)
        throw new GodotMCPError('Both name and new_name required', 'INVALID_ARGS', 'Provide name and new_name.')

      const fullPath = resolveScenePath(projectPath, scenePath)
      if (!(await pathExists(fullPath)))
        throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')

      const content = await readFile(fullPath, 'utf-8')
      const updated = renameNodeInContent(content, nodeName, newName)
      await writeFile(fullPath, updated, 'utf-8')

      return formatSuccess(`Renamed node: ${nodeName} -> ${newName} in ${scenePath}`)
    }

    case 'list': {
      const scenePath = args.scene_path as string
      if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')

      const fullPath = resolveScenePath(projectPath, scenePath)
      if (!(await pathExists(fullPath)))
        throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')

      const content = await readFile(fullPath, 'utf-8')
      const scene = parseSceneContent(content)
      const nodes = scene.nodes.map(mapToSceneNode)

      return formatJSON({
        scene: scenePath,
        nodeCount: nodes.length,
        nodes: nodes.map((n) => ({
          name: n.name,
          type: n.type,
          parent: n.parent || '(root)',
          hasScript: n.script !== null,
        })),
      })
    }

    case 'set_property': {
      const scenePath = args.scene_path as string
      if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
      const nodeName = args.name as string
      const property = args.property as string
      const value = args.value as string
      if (!nodeName || !property || value === undefined) {
        throw new GodotMCPError(
          'name, property, and value required',
          'INVALID_ARGS',
          'Provide name, property, and value.',
        )
      }

      const fullPath = resolveScenePath(projectPath, scenePath)
      if (!(await pathExists(fullPath)))
        throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')

      const content = await readFile(fullPath, 'utf-8')
      const updated = setNodePropertyInContent(content, nodeName, property, value)
      await writeFile(fullPath, updated, 'utf-8')

      return formatSuccess(`Set ${property} = ${value} on node ${nodeName}`)
    }

    case 'get_property': {
      const scenePath = args.scene_path as string
      if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
      const nodeName = args.name as string
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

    default:
      throwUnknownAction(action, ['add', 'remove', 'rename', 'list', 'set_property', 'get_property'])
  }
}
