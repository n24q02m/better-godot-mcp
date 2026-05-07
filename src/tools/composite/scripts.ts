/**
 * Scripts tool - GDScript file management
 * Actions: create | read | write | attach | list | delete
 */

import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
import { pathExists, safeResolve } from '../helpers/paths.js'
import { escapeRegExp } from '../helpers/scene-parser.js'

const NODE_SECTION_RE = /(\[node [^\]]+\])/

const SCRIPT_TEMPLATES: Record<string, string> = {
  Node: `extends Node


func _ready() -> void:
	pass


func _process(delta: float) -> void:
	pass
`,
  Node2D: `extends Node2D


func _ready() -> void:
	pass


func _process(delta: float) -> void:
	pass
`,
  Node3D: `extends Node3D


func _ready() -> void:
	pass


func _process(delta: float) -> void:
	pass
`,
  CharacterBody2D: `extends CharacterBody2D

const SPEED = 300.0
const JUMP_VELOCITY = -400.0


func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity += get_gravity() * delta

	if Input.is_action_just_pressed("ui_accept") and is_on_floor():
		velocity.y = JUMP_VELOCITY

	var direction := Input.get_axis("ui_left", "ui_right")
	if direction:
		velocity.x = direction * SPEED
	else:
		velocity.x = move_toward(velocity.x, 0, SPEED)

	move_and_slide()
`,
  CharacterBody3D: `extends CharacterBody3D

const SPEED = 5.0
const JUMP_VELOCITY = 4.5


func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity += get_gravity() * delta

	if Input.is_action_just_pressed("ui_accept") and is_on_floor():
		velocity.y = JUMP_VELOCITY

	var input_dir := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
	var direction := (transform.basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()
	if direction:
		velocity.x = direction.x * SPEED
		velocity.z = direction.z * SPEED
	else:
		velocity.x = move_toward(velocity.x, 0, SPEED)
		velocity.z = move_toward(velocity.z, 0, SPEED)

	move_and_slide()
`,
  Control: `extends Control


func _ready() -> void:
	pass
`,
}

function getTemplate(extendsType: string): string {
  return SCRIPT_TEMPLATES[extendsType] || `extends ${extendsType}\n\n\nfunc _ready() -> void:\n\tpass\n`
}

async function findScriptFiles(dir: string, results: string[] = []): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const promises: Promise<string[]>[] = []

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      const name = entry.name
      if (name.startsWith('.') || name === 'node_modules' || name === 'build' || name === 'addons') continue

      const fullPath = join(dir, name)
      if (entry.isDirectory()) {
        promises.push(findScriptFiles(fullPath, results))
      } else if (name.endsWith('.gd')) {
        results.push(fullPath)
      }
    }

    if (promises.length > 0) {
      await Promise.all(promises)
    }
    return results
  } catch {
    // Skip inaccessible
    return results
  }
}

async function createScript(args: Record<string, unknown>, resolvePath: (path: string) => string) {
  const scriptPath = args.script_path as string
  if (!scriptPath)
    throw new GodotMCPError('No script_path specified', 'INVALID_ARGS', 'Provide script_path (e.g., "player.gd").')
  const extendsType = (args.extends as string) || 'Node'
  const content = (args.content as string) || getTemplate(extendsType)

  const fullPath = resolvePath(scriptPath)
  if (await pathExists(fullPath)) {
    throw new GodotMCPError(
      `Script already exists: ${scriptPath}`,
      'SCRIPT_ERROR',
      'Use write action to modify existing scripts.',
    )
  }

  await mkdir(dirname(fullPath), { recursive: true })
  await writeFile(fullPath, content, 'utf-8')
  return formatSuccess(`Created script: ${scriptPath}\nExtends: ${extendsType}`)
}

async function readScript(args: Record<string, unknown>, resolvePath: (path: string) => string) {
  const scriptPath = args.script_path as string
  if (!scriptPath) throw new GodotMCPError('No script_path specified', 'INVALID_ARGS', 'Provide script_path.')

  const fullPath = resolvePath(scriptPath)
  if (!(await pathExists(fullPath)))
    throw new GodotMCPError(`Script not found: ${scriptPath}`, 'SCRIPT_ERROR', 'Check the file path.')

  const content = await readFile(fullPath, 'utf-8')
  return formatSuccess(`File: ${scriptPath}\n\n${content}`)
}

async function writeScript(args: Record<string, unknown>, resolvePath: (path: string) => string) {
  const scriptPath = args.script_path as string
  if (!scriptPath) throw new GodotMCPError('No script_path specified', 'INVALID_ARGS', 'Provide script_path.')
  const content = args.content as string
  if (content === undefined || content === null)
    throw new GodotMCPError('No content specified', 'INVALID_ARGS', 'Provide content to write.')

  const fullPath = resolvePath(scriptPath)
  await mkdir(dirname(fullPath), { recursive: true })
  await writeFile(fullPath, content, 'utf-8')
  return formatSuccess(`Written: ${scriptPath} (${content.length} chars)`)
}

async function attachScript(args: Record<string, unknown>, resolvePath: (path: string) => string) {
  const scenePath = args.scene_path as string
  const scriptPath = args.script_path as string
  const nodeName = args.node_name as string
  if (!scenePath || !scriptPath) {
    throw new GodotMCPError(
      'Both scene_path and script_path required',
      'INVALID_ARGS',
      'Provide scene_path and script_path.',
    )
  }

  const sceneFullPath = resolvePath(scenePath)
  if (!(await pathExists(sceneFullPath)))
    throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Create the scene first.')

  let content = await readFile(sceneFullPath, 'utf-8')
  // ⚡ Bolt: Using replaceAll('\\', '/') avoids RegExp allocation overhead
  const resPath = `res://${scriptPath.replaceAll('\\', '/')}`

  if (nodeName) {
    const nodePattern = new RegExp(`(\\[node name="${escapeRegExp(nodeName)}"[^\\]]*\\])`)
    const match = content.match(nodePattern)
    if (!match)
      throw new GodotMCPError(
        `Node "${nodeName}" not found in scene`,
        'NODE_ERROR',
        'Check node name with nodes.list action.',
      )
    content = content.replace(nodePattern, (_match, p1) => `${p1}\nscript = ExtResource("${resPath}")`)
  } else {
    content = content.replace(NODE_SECTION_RE, (_match, p1) => `${p1}\nscript = ExtResource("${resPath}")`)
  }

  await writeFile(sceneFullPath, content, 'utf-8')
  return formatSuccess(`Attached script ${scriptPath} to ${nodeName || 'root node'} in ${scenePath}`)
}

async function listScripts(baseDir: string, projectPath: string | undefined) {
  if (!projectPath)
    throw new GodotMCPError('No project path specified', 'INVALID_ARGS', 'Provide project_path argument.')

  const resolvedPath = safeResolve(baseDir, projectPath)
  const scripts = await findScriptFiles(resolvedPath)

  // OPTIMIZATION: Use substring and a pre-allocated array instead of .map() and node:path.relative
  // for significantly faster execution on large arrays of prefixed paths.
  const prefixLen = resolvedPath.length + (resolvedPath.endsWith('/') || resolvedPath.endsWith('\\') ? 0 : 1)
  const relativePaths = new Array(scripts.length)
  for (let i = 0; i < scripts.length; i++) {
    // ⚡ Bolt: Using replaceAll('\\', '/') avoids RegExp allocation overhead
    relativePaths[i] = scripts[i].substring(prefixLen).replaceAll('\\', '/')
  }

  return formatJSON({ project: resolvedPath, count: relativePaths.length, scripts: relativePaths })
}

async function deleteScript(args: Record<string, unknown>, resolvePath: (path: string) => string) {
  const scriptPath = args.script_path as string
  if (!scriptPath) throw new GodotMCPError('No script_path specified', 'INVALID_ARGS', 'Provide script_path to delete.')

  const fullPath = resolvePath(scriptPath)
  if (!(await pathExists(fullPath)))
    throw new GodotMCPError(`Script not found: ${scriptPath}`, 'SCRIPT_ERROR', 'Check the file path.')

  await unlink(fullPath)
  return formatSuccess(`Deleted script: ${scriptPath}`)
}

export async function handleScripts(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const baseDir = config.projectPath || process.cwd()
  // Validate args.project_path against the trusted baseDir to prevent path traversal vulnerabilities
  const projectPath = args.project_path ? safeResolve(baseDir, args.project_path as string) : config.projectPath

  if (!projectPath && action !== 'list') {
    // List handles missing projectPath internally, but others need it for safeResolve base
    // Though list also throws if missing. Let's rely on standard checks inside but ensure projectPath is available for resolution.
    // Actually, all actions check projectPath. We can resolve it early.
  }

  // Helper to resolve path securely
  const resolvePath = (path: string) => {
    if (!projectPath) {
      // Should be caught by action-specific checks, but fallback for safety
      throw new GodotMCPError('No project path specified', 'INVALID_ARGS', 'Provide project_path argument.')
    }
    return safeResolve(projectPath, path)
  }

  switch (action) {
    case 'create':
      return createScript(args, resolvePath)
    case 'read':
      return readScript(args, resolvePath)
    case 'write':
      return writeScript(args, resolvePath)
    case 'attach':
      return attachScript(args, resolvePath)
    case 'list':
      return listScripts(baseDir, projectPath ?? undefined)
    case 'delete':
      return deleteScript(args, resolvePath)
    default:
      throwUnknownAction(action, ['create', 'read', 'write', 'attach', 'list', 'delete'])
  }
}
