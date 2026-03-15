/**
 * Scene Parser - Parse Godot .tscn (text scene) format
 *
 * .tscn format structure:
 * [gd_scene load_steps=N format=3 uid="uid://..."]
 * [ext_resource type="..." uid="uid://..." path="res://..." id="N_xxxxx"]
 * [sub_resource type="..." id="N_xxxxx"]
 * key = value
 * [node name="..." type="..." parent="."]
 * key = value
 * [connection signal="..." from="..." to="..." method="..."]
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { GodotMCPError } from './errors.js'

// Pre-compiled regular expressions for parsing scene sections
const rxGdSceneFormat = /format=(\d+)/
const rxGdSceneSteps = /load_steps=(\d+)/
const rxUid = /uid="([^"]*)"/
const rxType = /type="([^"]*)"/
const rxPath = /path="([^"]*)"/
const rxId = / id="([^"]*)"/
const rxName = /name="([^"]*)"/
const rxParent = /parent="([^"]*)"/
const rxInstance = /instance=ExtResource\("([^"]*)"\)/
const rxGroups = /groups=\[([^\]]*)\]/
const rxSignal = /signal="([^"]*)"/
const rxFrom = /from="([^"]*)"/
const rxTo = /to="([^"]*)"/
const rxMethod = /method="([^"]*)"/
const rxFlags = /flags=(\d+)/

export interface TscnHeader {
  format: number
  loadSteps: number
  uid?: string
}

export interface ExtResource {
  type: string
  uid?: string
  path: string
  id: string
}

export interface SubResource {
  type: string
  id: string
  properties: Record<string, string>
}

export interface SceneNodeInfo {
  name: string
  type?: string
  parent?: string
  instance?: string
  properties: Record<string, string>
  groups?: string[]
}

export interface SignalConnection {
  signal: string
  from: string
  to: string
  method: string
  flags?: number
}

export interface ParsedScene {
  header: TscnHeader
  extResources: ExtResource[]
  subResources: SubResource[]
  nodes: SceneNodeInfo[]
  connections: SignalConnection[]
  raw: string
}

/**
 * Parse a .tscn file into structured data
 */
export function parseScene(filePath: string): ParsedScene {
  const raw = readFileSync(filePath, 'utf-8')
  return parseSceneContent(raw)
}

/**
 * Parse .tscn content string into structured data
 */
export function parseSceneContent(content: string): ParsedScene {
  const header: TscnHeader = { format: 3, loadSteps: 1 }
  const extResources: ExtResource[] = []
  const subResources: SubResource[] = []
  const nodes: SceneNodeInfo[] = []
  const connections: SignalConnection[] = []

  let currentSection: 'header' | 'ext_resource' | 'sub_resource' | 'node' | 'connection' | null = null
  let currentNode: SceneNodeInfo | null = null
  let currentSubResource: SubResource | null = null

  let startIndex = 0
  const len = content.length

  while (startIndex < len) {
    let endIndex = content.indexOf('\n', startIndex)
    if (endIndex === -1) endIndex = len

    let start = startIndex
    // Skip leading whitespace manually
    while (start < endIndex && content.charCodeAt(start) <= 32) {
      start++
    }

    let end = endIndex
    // Skip trailing whitespace manually
    while (end > start && content.charCodeAt(end - 1) <= 32) {
      end--
    }

    if (start < end) {
      const firstChar = content.charCodeAt(start)
      // Skip comments starting with ';'
      if (firstChar !== 59) {
        if (firstChar === 91) {
          // '[' character indicates a new section
          // Save previous node/sub_resource
          if (currentNode) nodes.push(currentNode)
          if (currentSubResource) subResources.push(currentSubResource)
          currentNode = null
          currentSubResource = null

          const line = content.slice(start, end)
          if (line.startsWith('[gd_scene')) {
            currentSection = 'header'
            const formatMatch = line.match(rxGdSceneFormat)
            const stepsMatch = line.match(rxGdSceneSteps)
            const uidMatch = line.match(rxUid)
            if (formatMatch) header.format = Number.parseInt(formatMatch[1], 10)
            if (stepsMatch) header.loadSteps = Number.parseInt(stepsMatch[1], 10)
            if (uidMatch) header.uid = uidMatch[1]
          } else if (line.startsWith('[ext_resource')) {
            currentSection = 'ext_resource'
            const typeMatch = line.match(rxType)
            const uidMatch = line.match(rxUid)
            const pathMatch = line.match(rxPath)
            const idMatch = line.match(rxId)
            if (typeMatch && pathMatch && idMatch) {
              extResources.push({
                type: typeMatch[1],
                uid: uidMatch?.[1],
                path: pathMatch[1],
                id: idMatch[1],
              })
            }
          } else if (line.startsWith('[sub_resource')) {
            currentSection = 'sub_resource'
            const typeMatch = line.match(rxType)
            const idMatch = line.match(rxId)
            if (typeMatch && idMatch) {
              currentSubResource = { type: typeMatch[1], id: idMatch[1], properties: {} }
            }
          } else if (line.startsWith('[node')) {
            currentSection = 'node'
            const nameMatch = line.match(rxName)
            const typeMatch = line.match(rxType)
            const parentMatch = line.match(rxParent)
            const instanceMatch = line.match(rxInstance)
            const groupsMatch = line.match(rxGroups)
            if (nameMatch) {
              currentNode = {
                name: nameMatch[1],
                type: typeMatch?.[1],
                parent: parentMatch?.[1],
                instance: instanceMatch?.[1],
                properties: {},
                groups: groupsMatch
                  ? groupsMatch[1]
                      .split(',')
                      .map((g) => g.trim().replace(/"/g, ''))
                      .filter(Boolean)
                  : undefined,
              }
            }
          } else if (line.startsWith('[connection')) {
            currentSection = 'connection'
            const signalMatch = line.match(rxSignal)
            const fromMatch = line.match(rxFrom)
            const toMatch = line.match(rxTo)
            const methodMatch = line.match(rxMethod)
            const flagsMatch = line.match(rxFlags)
            if (signalMatch && fromMatch && toMatch && methodMatch) {
              connections.push({
                signal: signalMatch[1],
                from: fromMatch[1],
                to: toMatch[1],
                method: methodMatch[1],
                flags: flagsMatch ? Number.parseInt(flagsMatch[1], 10) : undefined,
              })
            }
          }
        } else if (currentSection === 'node' || currentSection === 'sub_resource') {
          // Fast parsing of key-value properties without regex
          const eqIdx = content.indexOf('=', start)
          if (eqIdx !== -1 && eqIdx < end) {
            // Trim key
            let kEnd = eqIdx
            while (kEnd > start && content.charCodeAt(kEnd - 1) <= 32) {
              kEnd--
            }
            const key = content.slice(start, kEnd)

            // Trim value
            let vStart = eqIdx + 1
            while (vStart < end && content.charCodeAt(vStart) <= 32) {
              vStart++
            }
            const value = content.slice(vStart, end)

            if (currentSection === 'node' && currentNode) {
              currentNode.properties[key] = value
            } else if (currentSection === 'sub_resource' && currentSubResource) {
              currentSubResource.properties[key] = value
            }
          }
        }
      }
    }

    startIndex = endIndex + 1
  }

  // Save last pending section
  if (currentNode) nodes.push(currentNode)
  if (currentSubResource) subResources.push(currentSubResource)

  return { header, extResources, subResources, nodes, connections, raw: content }
}

/**
 * Find a node in a parsed scene by name
 */
export function findNode(scene: ParsedScene, name: string): SceneNodeInfo | undefined {
  return scene.nodes.find((n) => n.name === name)
}

/**
 * Get the full node path for a node
 */
export function getNodePath(_scene: ParsedScene, node: SceneNodeInfo): string {
  if (!node.parent) return node.name // Root node
  if (node.parent === '.') return node.name
  return `${node.parent}/${node.name}`
}

/**
 * Remove a node from scene content by name
 */
export function removeNodeFromContent(content: string, nodeName: string): string {
  // Fast-path: Skip allocations and processing if the node name is not in the content
  if (
    !content.includes(`name="${nodeName}"`) &&
    !content.includes(`from="${nodeName}"`) &&
    !content.includes(`to="${nodeName}"`)
  ) {
    return content
  }

  const lines = content.split('\n')
  const result: string[] = []
  let skipping = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('[node') && trimmed.includes(`name="${nodeName}"`)) {
      skipping = true
      continue
    }

    if (skipping && trimmed.startsWith('[')) {
      skipping = false
    }

    if (!skipping) {
      result.push(line)
    }
  }

  // Also remove connections referencing this node
  return result
    .filter((line) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('[connection')) {
        return !trimmed.includes(`from="${nodeName}"`) && !trimmed.includes(`to="${nodeName}"`)
      }
      return true
    })
    .join('\n')
}

/**
 * Escape special characters in a string for use in a regular expression
 */
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Rename a node in scene content
 */
export function renameNodeInContent(content: string, oldName: string, newName: string): string {
  // Fast-path: Skip processing if the old name is not in the content
  if (!content.includes(oldName)) {
    return content
  }

  const escapedOldName = escapeRegExp(oldName)

  // Replace in node declarations
  let result = content.replace(new RegExp(`name="${escapedOldName}"`, 'g'), `name="${newName}"`)
  // Replace in parent references
  result = result.replace(new RegExp(`parent="${escapedOldName}"`, 'g'), `parent="${newName}"`)
  // Replace in parent paths containing the old name
  result = result.replace(new RegExp(`parent="([^"]*/)${escapedOldName}(/[^"]*)"`, 'g'), `parent="$1${newName}$2"`)
  result = result.replace(new RegExp(`parent="([^"]*/)${escapedOldName}"`, 'g'), `parent="$1${newName}"`)
  // Replace in connection references
  result = result.replace(new RegExp(`from="${escapedOldName}"`, 'g'), `from="${newName}"`)
  result = result.replace(new RegExp(`to="${escapedOldName}"`, 'g'), `to="${newName}"`)
  return result
}

/**
 * Set a property on a node in scene content
 */
export function setNodePropertyInContent(content: string, nodeName: string, property: string, value: string): string {
  // Fast-path: Skip allocations and processing if the node name is not in the content
  if (!content.includes(`name="${nodeName}"`)) {
    return content
  }

  const lines = content.split('\n')
  const result: string[] = []
  let inTargetNode = false
  let propertySet = false

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()

    if (trimmed.startsWith('[node') && trimmed.includes(`name="${nodeName}"`)) {
      inTargetNode = true
      result.push(lines[i])
      continue
    }

    if (inTargetNode && trimmed.startsWith('[')) {
      // Entering new section - add property if not yet set
      if (!propertySet) {
        result.push(`${property} = ${value}`)
        propertySet = true
      }
      inTargetNode = false
    }

    if (inTargetNode && trimmed.startsWith(`${property} `)) {
      // Replace existing property
      result.push(`${property} = ${value}`)
      propertySet = true
      continue
    }

    result.push(lines[i])
  }

  // If node was last section and property wasn't set
  if (inTargetNode && !propertySet) {
    result.push(`${property} = ${value}`)
  }

  return result.join('\n')
}

/**
 * Get a property value from a node in a parsed scene
 */
export function getNodeProperty(scene: ParsedScene, nodeName: string, property: string): string | undefined {
  const node = findNode(scene, nodeName)
  return node?.properties[property]
}

/**
 * Write a parsed scene back to file (using raw content)
 */
export function writeScene(filePath: string, content: string): void {
  writeFileSync(filePath, content, 'utf-8')
}

/**
 * Create a regular expression for matching a specific node's header in a Godot scene file.
 */
export function getNodeHeaderRegex(nodeName: string): RegExp {
  return new RegExp(`(\\[node name="${escapeRegExp(nodeName)}"[^\\]]*\\])`)
}

/**
 * Find a node declaration by name in scene file content, or throw a GodotMCPError if not found.
 */
export function matchNodeOrThrow(content: string, nodeName: string): RegExpMatchArray {
  const match = content.match(getNodeHeaderRegex(nodeName))
  if (!match || match.index === undefined) {
    throw new GodotMCPError(`Node "${nodeName}" not found`, 'NODE_ERROR', 'Check node name.')
  }
  return match
}
