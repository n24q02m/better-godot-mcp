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

  const lines = content.split('\n')
  let currentSection: 'header' | 'ext_resource' | 'sub_resource' | 'node' | 'connection' | null = null
  let currentNode: SceneNodeInfo | null = null
  let currentSubResource: SubResource | null = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith(';')) continue

    // Section headers
    if (line.startsWith('[')) {
      // Save previous node/sub_resource
      if (currentNode) nodes.push(currentNode)
      if (currentSubResource) subResources.push(currentSubResource)
      currentNode = null
      currentSubResource = null

      if (line.startsWith('[gd_scene')) {
        currentSection = 'header'
        const formatMatch = line.match(/format=(\d+)/)
        const stepsMatch = line.match(/load_steps=(\d+)/)
        const uidMatch = line.match(/uid="([^"]*)"/)
        if (formatMatch) header.format = Number.parseInt(formatMatch[1], 10)
        if (stepsMatch) header.loadSteps = Number.parseInt(stepsMatch[1], 10)
        if (uidMatch) header.uid = uidMatch[1]
      } else if (line.startsWith('[ext_resource')) {
        currentSection = 'ext_resource'
        const typeMatch = line.match(/type="([^"]*)"/)
        const uidMatch = line.match(/uid="([^"]*)"/)
        const pathMatch = line.match(/path="([^"]*)"/)
        const idMatch = line.match(/ id="([^"]*)"/)
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
        const typeMatch = line.match(/type="([^"]*)"/)
        const idMatch = line.match(/ id="([^"]*)"/)
        if (typeMatch && idMatch) {
          currentSubResource = { type: typeMatch[1], id: idMatch[1], properties: {} }
        }
      } else if (line.startsWith('[node')) {
        currentSection = 'node'
        const nameMatch = line.match(/name="([^"]*)"/)
        const typeMatch = line.match(/type="([^"]*)"/)
        const parentMatch = line.match(/parent="([^"]*)"/)
        const instanceMatch = line.match(/instance=ExtResource\("([^"]*)"\)/)
        const groupsMatch = line.match(/groups=\[([^\]]*)\]/)
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
        const signalMatch = line.match(/signal="([^"]*)"/)
        const fromMatch = line.match(/from="([^"]*)"/)
        const toMatch = line.match(/to="([^"]*)"/)
        const methodMatch = line.match(/method="([^"]*)"/)
        const flagsMatch = line.match(/flags=(\d+)/)
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
      continue
    }

    // Properties within sections
    const propMatch = line.match(/^(\w+)\s*=\s*(.+)$/)
    if (propMatch) {
      const [, key, value] = propMatch
      if (currentSection === 'node' && currentNode) {
        currentNode.properties[key] = value
      } else if (currentSection === 'sub_resource' && currentSubResource) {
        currentSubResource.properties[key] = value
      }
    }
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
 * Rename a node in scene content
 */
export function renameNodeInContent(content: string, oldName: string, newName: string): string {
  // Replace in node declarations
  let result = content.replace(new RegExp(`name="${oldName}"`, 'g'), `name="${newName}"`)
  // Replace in parent references
  result = result.replace(new RegExp(`parent="${oldName}"`, 'g'), `parent="${newName}"`)
  // Replace in parent paths containing the old name
  result = result.replace(new RegExp(`parent="([^"]*/)${oldName}(/[^"]*)"`, 'g'), `parent="$1${newName}$2"`)
  result = result.replace(new RegExp(`parent="([^"]*/)${oldName}"`, 'g'), `parent="$1${newName}"`)
  // Replace in connection references
  result = result.replace(new RegExp(`from="${oldName}"`, 'g'), `from="${newName}"`)
  result = result.replace(new RegExp(`to="${oldName}"`, 'g'), `to="${newName}"`)
  return result
}

/**
 * Set a property on a node in scene content
 */
export function setNodePropertyInContent(content: string, nodeName: string, property: string, value: string): string {
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
