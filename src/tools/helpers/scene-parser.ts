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

import { readFile } from 'node:fs/promises'
import { parseCommaSeparatedList } from './strings.js'

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
          const line = content.slice(start, end)

          if (secondChar === 103) {
            // 'g' -> [gd_scene
            currentSection = 'header'
            parseHeader(line, header)
          } else if (secondChar === 101) {
            // 'e' -> [ext_resource
            currentSection = 'ext_resource'
            const res = parseExtResource(line)
            if (res) extResources.push(res)
          } else if (secondChar === 115) {
            // 's' -> [sub_resource
            currentSection = 'sub_resource'
            currentSubResource = parseSubResource(line)
          } else if (secondChar === 110) {
            // 'n' -> [node
            currentSection = 'node'
            currentNode = parseNode(line)
          } else if (secondChar === 99) {
            // 'c' -> [connection
            currentSection = 'connection'
            const conn = parseConnection(line)
            if (conn) connections.push(conn)
          }
        } else if (currentSection === 'node' || currentSection === 'sub_resource') {
          const target = currentSection === 'node' ? currentNode?.properties : currentSubResource?.properties
          if (target) {
            parseProperty(content, start, end, target)
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
 * Parse header section [gd_scene ...]
 */
function parseHeader(line: string, header: TscnHeader): void {
  const formatMatch = line.includes('format=') ? line.match(rxGdSceneFormat) : null
  const stepsMatch = line.includes('load_steps=') ? line.match(rxGdSceneSteps) : null
  const uidMatch = line.includes('uid=') ? line.match(rxUid) : null

  if (formatMatch) header.format = Number.parseInt(formatMatch[1], 10)
  if (stepsMatch) header.loadSteps = Number.parseInt(stepsMatch[1], 10)
  if (uidMatch) header.uid = uidMatch[1]
}

/**
 * Parse external resource section [ext_resource ...]
 */
function parseExtResource(line: string): ExtResource | null {
  const typeMatch = line.includes('type="') ? line.match(rxType) : null
  const uidMatch = line.includes('uid=') ? line.match(rxUid) : null
  const pathMatch = line.includes('path="') ? line.match(rxPath) : null
  const idMatch = line.includes(' id="') ? line.match(rxId) : null

  if (typeMatch && pathMatch && idMatch) {
    return {
      type: typeMatch[1],
      uid: uidMatch?.[1],
      path: pathMatch[1],
      id: idMatch[1],
    }
  }
  return null
}

/**
 * Parse sub-resource section [sub_resource ...]
 */
function parseSubResource(line: string): SubResource | null {
  const typeMatch = line.includes('type="') ? line.match(rxType) : null
  const idMatch = line.includes(' id="') ? line.match(rxId) : null

  if (typeMatch && idMatch) {
    return { type: typeMatch[1], id: idMatch[1], properties: {} }
  }
  return null
}

/**
 * Parse node section [node ...]
 */
function parseNode(line: string): SceneNodeInfo | null {
  const nameMatch = line.includes('name="') ? line.match(rxName) : null
  const typeMatch = line.includes('type="') ? line.match(rxType) : null
  const parentMatch = line.includes('parent="') ? line.match(rxParent) : null
  const instanceMatch = line.includes('instance=') ? line.match(rxInstance) : null
  const groupsMatch = line.includes('groups=') ? line.match(rxGroups) : null

  if (nameMatch) {
    return {
      name: nameMatch[1],
      type: typeMatch?.[1],
      parent: parentMatch?.[1],
      instance: instanceMatch?.[1],
      properties: {},
      groups: groupsMatch ? parseCommaSeparatedList(groupsMatch[1]) : undefined,
    }
  }
  return null
}

/**
 * Parse signal connection section [connection ...]
 */
function parseConnection(line: string): SignalConnection | null {
  const signalMatch = line.includes('signal="') ? line.match(rxSignal) : null
  const fromMatch = line.includes('from="') ? line.match(rxFrom) : null
  const toMatch = line.includes('to="') ? line.match(rxTo) : null
  const methodMatch = line.includes('method="') ? line.match(rxMethod) : null
  const flagsMatch = line.includes('flags=') ? line.match(rxFlags) : null

  if (signalMatch && fromMatch && toMatch && methodMatch) {
    return {
      signal: signalMatch[1],
      from: fromMatch[1],
      to: toMatch[1],
      method: methodMatch[1],
      flags: flagsMatch ? Number.parseInt(flagsMatch[1], 10) : undefined,
    }
  }
  return null
}

/**
 * Parse a property line (key = value)
 */
function parseProperty(content: string, start: number, end: number, target: Record<string, string>): void {
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

    target[key] = value
  }
}

export function findNode(scene: ParsedScene, name: string): SceneNodeInfo | undefined {
  return scene.nodes.find((n) => n.name === name)
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
