/**
 * Scene Parser - Parse Godot .tscn (text scene) format
 *
 * .tscn format structure:
 * [gd_scene load_steps=N format=3 uid="uid://..."]
 * [ext_resource type="..." uid="uid://..." path="res://..." id="..."]
 * [sub_resource type="..." id="..."]
 * key = value
 * [node name="..." type="..." parent="."]
 * key = value
 * [connection signal="..." from="..." to="..." method="..."]
 */

import { readFile } from 'node:fs/promises'
import { parseCommaSeparatedList } from './strings.js'

/**
 * Fast-path string extraction for attributes like name="value"
 */
function extractAttribute(line: string, prefix: string, suffix: string): string | undefined {
  const startIdx = line.indexOf(prefix)
  if (startIdx === -1) return undefined
  const valueStart = startIdx + prefix.length
  const endIdx = line.indexOf(suffix, valueStart)
  if (endIdx === -1) return undefined
  return line.slice(valueStart, endIdx)
}

/**
 * Fast-path extraction for numeric attributes like format=3
 */
function extractNumberAttribute(line: string, prefix: string): number | undefined {
  const startIdx = line.indexOf(prefix)
  if (startIdx === -1) return undefined
  const valueStart = startIdx + prefix.length
  let endIdx = valueStart
  while (endIdx < line.length) {
    const charCode = line.charCodeAt(endIdx)
    if (charCode >= 48 && charCode <= 57) {
      // '0'-'9'
      endIdx++
    } else {
      break
    }
  }
  if (endIdx > valueStart) {
    return Number.parseInt(line.slice(valueStart, endIdx), 10)
  }
  return undefined
}

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
  const formatVal = extractNumberAttribute(line, 'format=')
  const stepsVal = extractNumberAttribute(line, 'load_steps=')
  const uidVal = extractAttribute(line, 'uid="', '"')

  if (formatVal !== undefined) header.format = formatVal
  if (stepsVal !== undefined) header.loadSteps = stepsVal
  if (uidVal !== undefined) header.uid = uidVal
}

/**
 * Parse external resource section [ext_resource ...]
 */
function parseExtResource(line: string): ExtResource | null {
  const typeVal = extractAttribute(line, 'type="', '"')
  const uidVal = extractAttribute(line, 'uid="', '"')
  const pathVal = extractAttribute(line, 'path="', '"')
  const idVal = extractAttribute(line, ' id="', '"')

  if (typeVal !== undefined && pathVal !== undefined && idVal !== undefined) {
    return {
      type: typeVal,
      uid: uidVal,
      path: pathVal,
      id: idVal,
    }
  }
  return null
}

/**
 * Parse sub-resource section [sub_resource ...]
 */
function parseSubResource(line: string): SubResource | null {
  const typeVal = extractAttribute(line, 'type="', '"')
  const idVal = extractAttribute(line, ' id="', '"')

  if (typeVal !== undefined && idVal !== undefined) {
    return { type: typeVal, id: idVal, properties: {} }
  }
  return null
}

/**
 * Parse node section [node ...]
 */
function parseNode(line: string): SceneNodeInfo | null {
  const nameVal = extractAttribute(line, 'name="', '"')
  const typeVal = extractAttribute(line, 'type="', '"')
  const parentVal = extractAttribute(line, 'parent="', '"')
  const instanceVal = extractAttribute(line, 'instance=ExtResource("', '")')
  const groupsVal = extractAttribute(line, 'groups=[', ']')

  if (nameVal !== undefined) {
    return {
      name: nameVal,
      type: typeVal,
      parent: parentVal,
      instance: instanceVal,
      properties: {},
      groups: groupsVal !== undefined ? parseCommaSeparatedList(groupsVal) : undefined,
    }
  }
  return null
}

/**
 * Parse signal connection section [connection ...]
 */
function parseConnection(line: string): SignalConnection | null {
  const signalVal = extractAttribute(line, 'signal="', '"')
  const fromVal = extractAttribute(line, 'from="', '"')
  const toVal = extractAttribute(line, 'to="', '"')
  const methodVal = extractAttribute(line, 'method="', '"')
  const flagsVal = extractNumberAttribute(line, 'flags=')

  if (signalVal !== undefined && fromVal !== undefined && toVal !== undefined && methodVal !== undefined) {
    return {
      signal: signalVal,
      from: fromVal,
      to: toVal,
      method: methodVal,
      flags: flagsVal,
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

  // ⚡ Bolt: Use exact string replacements via replaceAll instead of new RegExp(..., 'g')
  // This avoids expensive regex compilation and matching overhead for simple exact matches.
  let result = content.replaceAll(`name="${oldName}"`, `name="${newName}"`)
  result = result.replaceAll(`parent="${oldName}"`, `parent="${newName}"`)
  result = result.replaceAll(`from="${oldName}"`, `from="${newName}"`)
  result = result.replaceAll(`to="${oldName}"`, `to="${newName}"`)

  // Fallback to RegExp only for complex hierarchical path replacements
  // e.g., parent="Root/OldName/Child" or parent="Root/OldName"
  if (result.includes(`/${oldName}/`) || result.includes(`/${oldName}"`)) {
    const escapedOldName = escapeRegExp(oldName)
    result = result.replace(new RegExp(`parent="([^"]*/)${escapedOldName}(/[^"]*)"`, 'g'), `parent="$1${newName}$2"`)
    result = result.replace(new RegExp(`parent="([^"]*/)${escapedOldName}"`, 'g'), `parent="$1${newName}"`)
  }

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
