/**
 * Nodes tool - Scene node manipulation
 * Actions: add | remove | rename | list | set_property | get_property
 */

import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { GodotConfig, SceneNode } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError } from '../helpers/errors.js'
import {
  getNodeProperty,
  parseScene,
  removeNodeFromContent,
  renameNodeInContent,
  setNodePropertyInContent,
  writeSceneAsync,
} from '../helpers/scene-parser.js'

/**
 * Parse nodes from .tscn content
 */
function parseNodes(content: string): SceneNode[] {
  const nodes: SceneNode[] = []
  const lines = content.split('\n')
  let currentNode: SceneNode | null = null

  for (const line of lines) {
    const trimmed = line.trim()

    const nodeMatch = trimmed.match(/^\[node\s+name="([^"]+)"\s+type="([^"]+)"(?:\s+parent="([^"]*)")?/)
    if (nodeMatch) {
      currentNode = {
        name: nodeMatch[1],
        type: nodeMatch[2],
        parent: nodeMatch[3] ?? null,
        properties: {},
        script: null,
      }
      nodes.push(currentNode)
      continue
    }

    if (currentNode && !trimmed.startsWith('[')) {
      const propMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/)
      if (propMatch) {
        if (propMatch[1] === 'script') {
          currentNode.script = propMatch[2]
        } else {
          currentNode.properties[propMatch[1]] = propMatch[2]
        }
      }
    }

    if (trimmed.startsWith('[') && !trimmed.startsWith('[node')) {
      currentNode = null
    }
  }

  return nodes
}

function resolveScenePath(projectPath: string | null | undefined, scenePath: string): string {
  return projectPath ? resolve(projectPath, scenePath) : resolve(scenePath)
}

export async function handleNodes(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const projectPath = (args.project_path as string) || config.projectPath

  switch (action) {
    case 'add': {
      const scenePath = args.scene_path as string
      if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
      const nodeName = args.name as string
      if (!nodeName) throw new GodotMCPError('No node name specified', 'INVALID_ARGS', 'Provide name for the new node.')
      const nodeType = (args.type as string) || 'Node'
      const parent = (args.parent as string) || '.'

      const fullPath = resolveScenePath(projectPath, scenePath)
      if (!existsSync(fullPath))
        throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Create the scene first.')

      const content = await readFile(fullPath, 'utf-8')
      const existingNodes = parseNodes(content)
      const duplicate = existingNodes.find((n) => n.name === nodeName && (n.parent || '.') === parent)
      if (duplicate) {
        throw new GodotMCPError(
          `Node "${nodeName}" already exists under parent "${parent}"`,
          'NODE_ERROR',
          'Use a different name.',
        )
      }

      const parentAttr = parent === '.' ? '' : ` parent="${parent}"`
      const nodeDecl = `\n[node name="${nodeName}" type="${nodeType}"${parentAttr}]\n`
      const updated = `${content.trimEnd()}\n${nodeDecl}`
      await writeSceneAsync(fullPath, updated)

      return formatSuccess(`Added node: ${nodeName} (${nodeType}) under ${parent}`)
    }

    case 'remove': {
      const scenePath = args.scene_path as string
      if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')
      const nodeName = args.name as string
      if (!nodeName)
        throw new GodotMCPError('No node name specified', 'INVALID_ARGS', 'Provide name of node to remove.')

      const fullPath = resolveScenePath(projectPath, scenePath)
      if (!existsSync(fullPath))
        throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')

      const content = await readFile(fullPath, 'utf-8')
      const updated = removeNodeFromContent(content, nodeName)
      await writeSceneAsync(fullPath, updated)

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
      if (!existsSync(fullPath))
        throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')

      const content = await readFile(fullPath, 'utf-8')
      const updated = renameNodeInContent(content, nodeName, newName)
      await writeSceneAsync(fullPath, updated)

      return formatSuccess(`Renamed node: ${nodeName} -> ${newName} in ${scenePath}`)
    }

    case 'list': {
      const scenePath = args.scene_path as string
      if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')

      const fullPath = resolveScenePath(projectPath, scenePath)
      if (!existsSync(fullPath))
        throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')

      const content = await readFile(fullPath, 'utf-8')
      const nodes = parseNodes(content)

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
      if (!existsSync(fullPath))
        throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')

      const content = await readFile(fullPath, 'utf-8')
      const updated = setNodePropertyInContent(content, nodeName, property, value)
      await writeSceneAsync(fullPath, updated)

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
      if (!existsSync(fullPath))
        throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')

      const scene = await parseScene(fullPath)
      const val = getNodeProperty(scene, nodeName, property)

      return formatJSON({ node: nodeName, property, value: val ?? null })
    }

    default:
      throw new GodotMCPError(
        `Unknown action: ${action}`,
        'INVALID_ACTION',
        'Valid actions: add, remove, rename, list, set_property, get_property. Use help tool for full docs.',
      )
  }
}
