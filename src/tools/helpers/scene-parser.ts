/**
 * Scene Parser - Parse and manipulate Godot .tscn (text scene) format
 */

import { parseCommaSeparatedList } from './strings.js'

function extractAttribute(line: string, prefix: string, suffix: string): string | undefined {
  const startIdx = line.indexOf(prefix)
  if (startIdx === -1) return undefined
  const valueStart = startIdx + prefix.length
  const endIdx = line.indexOf(suffix, valueStart)
  if (endIdx === -1) return undefined
  return line.slice(valueStart, endIdx)
}

function extractNumberAttribute(line: string, prefix: string): number | undefined {
  const startIdx = line.indexOf(prefix)
  if (startIdx === -1) return undefined
  const valueStart = startIdx + prefix.length
  let endIdx = valueStart
  while (endIdx < line.length) {
    const charCode = line.charCodeAt(endIdx)
    if (charCode >= 48 && charCode <= 57) endIdx++
    else break
  }
  if (endIdx > valueStart) return Number.parseInt(line.slice(valueStart, endIdx), 10)
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
  nodesByPath: Map<string, SceneNodeInfo>
  nodesByName: Map<string, SceneNodeInfo>
  connectionsKeyed: Map<string, SignalConnection>
}

export function parseSceneContent(content: string): ParsedScene {
  const header: TscnHeader = { format: 3, loadSteps: 1 }
  const extResources: ExtResource[] = []
  const subResources: SubResource[] = []
  const nodes: SceneNodeInfo[] = []
  const connections: SignalConnection[] = []
  const nodesByPath = new Map<string, SceneNodeInfo>()
  const nodesByName = new Map<string, SceneNodeInfo>()
  const connectionsKeyed = new Map<string, SignalConnection>()

  let currentSection: 'header' | 'ext_resource' | 'sub_resource' | 'node' | 'connection' | null = null
  let currentNode: SceneNodeInfo | null = null
  let currentSubResource: SubResource | null = null

  let startIndex = 0
  const len = content.length

  const saveCurrentNode = () => {
    if (currentNode) {
      nodes.push(currentNode)
      const pathKey = `${currentNode.parent || '.'}:${currentNode.name}`
      nodesByPath.set(pathKey, currentNode)
      if (!nodesByName.has(currentNode.name)) nodesByName.set(currentNode.name, currentNode)
      currentNode = null
    }
  }

  while (startIndex < len) {
    let endIndex = content.indexOf('\n', startIndex)
    if (endIndex === -1) endIndex = len
    let start = startIndex
    while (start < endIndex && content.charCodeAt(start) <= 32) start++
    let end = endIndex
    while (end > start && content.charCodeAt(end - 1) <= 32) end--
    if (start < end) {
      const firstChar = content.charCodeAt(start)
      if (firstChar !== 59) {
        if (firstChar === 91) {
          saveCurrentNode()
          if (currentSubResource) subResources.push(currentSubResource)
          currentSubResource = null
          const secondChar = content.charCodeAt(start + 1)
          const line = content.slice(start, end)
          if (secondChar === 103) {
            currentSection = 'header'
            const f = extractNumberAttribute(line, 'format=')
            if (f !== undefined) header.format = f
            const s = extractNumberAttribute(line, 'load_steps=')
            if (s !== undefined) header.loadSteps = s
            const u = extractAttribute(line, 'uid="', '"')
            if (u !== undefined) header.uid = u
          } else if (secondChar === 101) {
            currentSection = 'ext_resource'
            const t = extractAttribute(line, 'type="', '"')
            const u = extractAttribute(line, 'uid="', '"')
            const p = extractAttribute(line, 'path="', '"')
            const i = extractAttribute(line, ' id="', '"')
            if (t && p && i) extResources.push({ type: t, uid: u, path: p, id: i })
          } else if (secondChar === 115) {
            currentSection = 'sub_resource'
            const t = extractAttribute(line, 'type="', '"')
            const i = extractAttribute(line, ' id="', '"')
            if (t && i) currentSubResource = { type: t, id: i, properties: {} }
          } else if (secondChar === 110) {
            currentSection = 'node'
            const n = extractAttribute(line, 'name="', '"')
            if (n) {
              const groupsStr = extractAttribute(line, 'groups=[', ']')
              currentNode = {
                name: n,
                type: extractAttribute(line, 'type="', '"'),
                parent: extractAttribute(line, 'parent="', '"'),
                instance: extractAttribute(line, 'instance=ExtResource("', '")'),
                properties: {},
                groups: groupsStr ? parseCommaSeparatedList(groupsStr) : undefined,
              }
            }
          } else if (secondChar === 99) {
            currentSection = 'connection'
            const s = extractAttribute(line, 'signal="', '"')
            const f = extractAttribute(line, 'from="', '"')
            const t = extractAttribute(line, 'to="', '"')
            const m = extractAttribute(line, 'method="', '"')
            const fl = extractNumberAttribute(line, 'flags=')
            if (s && f && t && m) {
              const c = { signal: s, from: f, to: t, method: m, flags: fl }
              connections.push(c)
              connectionsKeyed.set(`${s}:${f}:${t}:${m}`, c)
            }
          }
        } else if (currentSection === 'node' || currentSection === 'sub_resource') {
          const target = currentSection === 'node' ? currentNode?.properties : currentSubResource?.properties
          if (target) {
            const eqIdx = content.indexOf('=', start)
            if (eqIdx !== -1 && eqIdx < end) {
              let kEnd = eqIdx
              while (kEnd > start && content.charCodeAt(kEnd - 1) <= 32) kEnd--
              let vStart = eqIdx + 1
              while (vStart < end && content.charCodeAt(vStart) <= 32) vStart++
              target[content.slice(start, kEnd)] = content.slice(vStart, end)
            }
          }
        }
      }
    }
    startIndex = endIndex + 1
  }
  saveCurrentNode()
  if (currentSubResource) subResources.push(currentSubResource)
  return {
    header,
    extResources,
    subResources,
    nodes,
    connections,
    raw: content,
    nodesByPath,
    nodesByName,
    connectionsKeyed,
  }
}

function transformSceneContent(
  content: string,
  nodeName: string,
  callbacks: {
    processLine: (line: string, inTargetNode: boolean, isSectionHeader: boolean) => string | string[] | null
    onTargetNodeEnd?: () => string | string[] | null
  },
): string {
  const result: string[] = []
  let pos = 0
  const len = content.length
  let inTargetNode = false
  let firstNodeFound = false
  while (pos < len) {
    let nextNewline = content.indexOf('\n', pos)
    if (nextNewline === -1) nextNewline = len
    let start = pos
    while (start < nextNewline && content.charCodeAt(start) <= 32) start++
    const line = content.slice(pos, nextNewline)
    if (content.charCodeAt(start) === 91) {
      if (inTargetNode && callbacks.onTargetNodeEnd) {
        const ex = callbacks.onTargetNodeEnd()
        if (ex) {
          if (Array.isArray(ex)) result.push(...ex)
          else result.push(ex)
        }
      }
      if (content.charCodeAt(start + 1) === 110) {
        if (nodeName === '.') {
          if (!firstNodeFound) {
            inTargetNode = true
            firstNodeFound = true
          } else inTargetNode = false
        } else {
          inTargetNode = line.includes(`name="${nodeName}"`)
          firstNodeFound = true
        }
      } else inTargetNode = false
    }
    const processed = callbacks.processLine(line, inTargetNode, content.charCodeAt(start) === 91)
    if (processed !== null) {
      if (Array.isArray(processed)) result.push(...processed)
      else result.push(processed)
    }
    pos = nextNewline + 1
  }
  if (inTargetNode && callbacks.onTargetNodeEnd) {
    const ex = callbacks.onTargetNodeEnd()
    if (ex) {
      if (Array.isArray(ex)) result.push(...ex)
      else result.push(ex)
    }
  }
  return result.join('\n')
}

export function updateNodeInScene(
  content: string,
  nodeName: string,
  updates: Record<string, string>,
): { content: string; updated: boolean } {
  if (nodeName !== '.' && !content.includes(`name="${nodeName}"`)) return { content, updated: false }
  const updatedProperties = new Set<string>()
  const newContent = transformSceneContent(content, nodeName, {
    processLine: (line, inTargetNode, isSectionHeader) => {
      if (inTargetNode && !isSectionHeader) {
        const trimmed = line.trimStart()
        for (const key in updates) {
          if (Object.hasOwn(updates, key) && (trimmed.startsWith(`${key} `) || trimmed.startsWith(`${key}=`))) {
            updatedProperties.add(key)
            return `${key} = ${updates[key]}`
          }
        }
      }
      return line
    },
    onTargetNodeEnd: () => {
      const added: string[] = []
      for (const key in updates) {
        if (Object.hasOwn(updates, key) && !updatedProperties.has(key)) added.push(`${key} = ${updates[key]}`)
      }
      return added
    },
  })
  return { content: newContent, updated: true }
}

export function findNode(scene: ParsedScene, name: string): SceneNodeInfo | undefined {
  if (name === '.' && scene.nodes.length > 0) return scene.nodes[0]
  return scene.nodesByName.get(name)
}
export function removeNodeFromContent(content: string, nodeName: string): string {
  if (
    nodeName !== '.' &&
    !content.includes(`name="${nodeName}"`) &&
    !content.includes(`from="${nodeName}"`) &&
    !content.includes(`to="${nodeName}"`)
  )
    return content
  let skipping = false
  return transformSceneContent(content, nodeName, {
    processLine: (line, inTargetNode, isSectionHeader) => {
      if (isSectionHeader) {
        skipping = inTargetNode
        if (skipping) return null
      }
      if (skipping) return null
      if (
        line.charCodeAt(line.indexOf('[')) === 91 &&
        line.charCodeAt(line.indexOf('[') + 1) === 99 &&
        nodeName !== '.' &&
        (line.includes(`from="${nodeName}"`) || line.includes(`to="${nodeName}"`))
      )
        return null
      return line
    },
  })
}
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
export function renameNodeInContent(content: string, oldName: string, newName: string): string {
  if (oldName === '.' || !content.includes(oldName)) return content
  let res = content
    .replaceAll(`name="${oldName}"`, () => `name="${newName}"`)
    .replaceAll(`parent="${oldName}"`, () => `parent="${newName}"`)
    .replaceAll(`from="${oldName}"`, () => `from="${newName}"`)
    .replaceAll(`to="${oldName}"`, () => `to="${newName}"`)
  if (res.includes(`/${oldName}/`) || res.includes(`/${oldName}"`)) {
    const esc = escapeRegExp(oldName)
    res = res
      .replace(new RegExp(`parent="([^"]*/)${esc}(/[^"]*)"`, 'g'), (_m, p1, p2) => `parent="${p1}${newName}${p2}"`)
      .replace(new RegExp(`parent="([^"]*/)${esc}"`, 'g'), (_m, p1) => `parent="${p1}${newName}"`)
  }
  return res
}
export function setNodePropertyInContent(content: string, nodeName: string, property: string, value: string): string {
  return updateNodeInScene(content, nodeName, { [property]: value }).content
}
export function getNodeProperty(scene: ParsedScene, nodeName: string, property: string): string | undefined {
  return findNode(scene, nodeName)?.properties[property]
}
export function normalizeNodePath(path: string): { path: string; corrected: boolean } {
  if (!path) return { path: '', corrected: false }
  const original = path
  let curr = path.trim()
  const gn = curr.match(/^get_node\s*\(\s*['"](.+?)['"]\s*\)$/i)
  if (gn) curr = gn[1]
  if (curr.startsWith('$')) curr = curr.slice(1) || '.'
  curr = curr.replace(/\\/g, '/').replace(/\/+/g, '/')
  const rm = curr.match(/^\/?root\/(.+)$/i)
  if (rm) {
    const segs = rm[1].split('/').filter(Boolean)
    curr = segs.length <= 1 ? '.' : segs.slice(1).join('/')
  } else if (curr.toLowerCase() === '/root' || curr.toLowerCase() === 'root') curr = '.'
  if (curr.startsWith('/') && curr.length > 1) curr = curr.slice(1)
  if (curr === '') curr = '.'
  return { path: curr, corrected: curr !== original }
}
