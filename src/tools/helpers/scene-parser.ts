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

import { readFile, writeFile } from 'node:fs/promises'

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
export async function parseScene(filePath: string): Promise<ParsedScene> {
  const raw = await readFile(filePath, 'utf-8')
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

          const secondChar = content.charCodeAt(start + 1)
          if (secondChar === 103) {
            // 'g' -> [gd_scene
            currentSection = 'header'
            const line = content.slice(start, end)
            const formatMatch = line.includes('format=') ? line.match(rxGdSceneFormat) : null
            const stepsMatch = line.includes('load_steps=') ? line.match(rxGdSceneSteps) : null
            const uidMatch = line.includes('uid=') ? line.match(rxUid) : null
            if (formatMatch) header.format = Number.parseInt(formatMatch[1], 10)
            if (stepsMatch) header.loadSteps = Number.parseInt(stepsMatch[1], 10)
            if (uidMatch) header.uid = uidMatch[1]
          } else if (secondChar === 101) {
            // 'e' -> [ext_resource
            currentSection = 'ext_resource'
            const line = content.slice(start, end)
            const typeMatch = line.includes('type="') ? line.match(rxType) : null
            const uidMatch = line.includes('uid=') ? line.match(rxUid) : null
            const pathMatch = line.includes('path="') ? line.match(rxPath) : null
            const idMatch = line.includes(' id="') ? line.match(rxId) : null
            if (typeMatch && pathMatch && idMatch) {
              extResources.push({
                type: typeMatch[1],
                uid: uidMatch?.[1],
                path: pathMatch[1],
                id: idMatch[1],
              })
            }
          } else if (secondChar === 115) {
            // 's' -> [sub_resource
            currentSection = 'sub_resource'
            const line = content.slice(start, end)
            const typeMatch = line.includes('type="') ? line.match(rxType) : null
            const idMatch = line.includes(' id="') ? line.match(rxId) : null
            if (typeMatch && idMatch) {
              currentSubResource = { type: typeMatch[1], id: idMatch[1], properties: {} }
            }
          } else if (secondChar === 110) {
            // 'n' -> [node
            currentSection = 'node'
            const line = content.slice(start, end)
            const nameMatch = line.includes('name="') ? line.match(rxName) : null
            const typeMatch = line.includes('type="') ? line.match(rxType) : null
            const parentMatch = line.includes('parent="') ? line.match(rxParent) : null
            const instanceMatch = line.includes('instance=') ? line.match(rxInstance) : null
            const groupsMatch = line.includes('groups=') ? line.match(rxGroups) : null
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
          } else if (secondChar === 99) {
            // 'c' -> [connection
            currentSection = 'connection'
            const line = content.slice(start, end)
            const signalMatch = line.includes('signal="') ? line.match(rxSignal) : null
            const fromMatch = line.includes('from="') ? line.match(rxFrom) : null
            const toMatch = line.includes('to="') ? line.match(rxTo) : null
            const methodMatch = line.includes('method="') ? line.match(rxMethod) : null
            const flagsMatch = line.includes('flags=') ? line.match(rxFlags) : null
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

  const result: string[] = []
  let pos = 0
  const len = content.length
  let skipping = false

  while (pos < len) {
    let nextNewline = content.indexOf('\n', pos)
    if (nextNewline === -1) nextNewline = len

    let start = pos
    while (start < nextNewline && content.charCodeAt(start) <= 32) start++

    const firstChar = content.charCodeAt(start)
    const secondChar = content.charCodeAt(start + 1)

    if (skipping && firstChar === 91) {
      // '['
      skipping = false
    }

    const line = content.slice(pos, nextNewline)

    if (!skipping && firstChar === 91 && secondChar === 110) {
      // '[n'
      if (line.includes(`name="${nodeName}"`)) {
        skipping = true
      }
    }

    if (!skipping) {
      if (firstChar === 91 && secondChar === 99) {
        // '[c'
        if (!line.includes(`from="${nodeName}"`) && !line.includes(`to="${nodeName}"`)) {
          result.push(line)
        }
      } else {
        result.push(line)
      }
    }

    pos = nextNewline + 1
  }

  return result.join('\n')
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

  const result: string[] = []
  let pos = 0
  const len = content.length
  let inTargetNode = false
  let propertySet = false

  while (pos < len) {
    let nextNewline = content.indexOf('\n', pos)
    if (nextNewline === -1) nextNewline = len

    let start = pos
    while (start < nextNewline && content.charCodeAt(start) <= 32) start++

    const firstChar = content.charCodeAt(start)
    const line = content.slice(pos, nextNewline)

    if (firstChar === 91) {
      // '['
      if (inTargetNode && !propertySet) {
        result.push(`${property} = ${value}`)
        propertySet = true
      }
      inTargetNode = false

      if (content.charCodeAt(start + 1) === 110 && line.includes(`name="${nodeName}"`)) {
        // '[n'
        inTargetNode = true
      }
      result.push(line)
    } else if (
      inTargetNode &&
      (content.startsWith(`${property} `, start) || content.startsWith(`${property}=`, start))
    ) {
      result.push(`${property} = ${value}`)
      propertySet = true
    } else {
      result.push(line)
    }

    pos = nextNewline + 1
  }

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
export async function writeScene(filePath: string, content: string): Promise<void> {
  await writeFile(filePath, content, 'utf-8')
}
