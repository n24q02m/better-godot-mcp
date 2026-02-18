/**
 * Shared types for Godot integration
 */

export interface GodotVersion {
  major: number
  minor: number
  patch: number
  label: string
  raw: string
}

export interface DetectionResult {
  path: string
  version: GodotVersion
  source: 'env' | 'path' | 'system'
}

export interface GodotConfig {
  godotPath: string | null
  godotVersion: GodotVersion | null
  projectPath: string | null
}

export interface HeadlessResult {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number | null
}

export interface ProjectInfo {
  name: string
  configVersion: number
  mainScene: string | null
  features: string[]
  settings: Record<string, string>
}

export interface SceneNode {
  name: string
  type: string
  parent: string | null
  properties: Record<string, string>
  script: string | null
}

export interface SceneInfo {
  path: string
  rootNode: string
  rootType: string
  nodeCount: number
  nodes: SceneNode[]
  resources: string[]
}
