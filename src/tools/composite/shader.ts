/**
 * Shader tool - Godot shader file management
 * Actions: create | read | write | get_params | list
 */

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
import { resolveProjectRoot, safeResolve } from '../helpers/paths.js'

const SHADER_TEMPLATES: Record<string, string> = {
  canvas_item: `shader_type canvas_item;

void fragment() {
\tCOLOR = texture(TEXTURE, UV);
}
`,
  spatial: `shader_type spatial;

void vertex() {
}

void fragment() {
\tALBEDO = vec3(1.0);
}
`,
  particles: `shader_type particles;

void start() {
\tTRANSFORM = EMISSION_TRANSFORM;
}

void process() {
}
`,
  sky: `shader_type sky;

void sky() {
\tCOLOR = vec3(0.4, 0.6, 0.9);
}
`,
  fog: `shader_type fog;

void fog() {
\tDENSITY = 0.01;
\tALBEDO = vec3(0.8);
}
`,
}

async function findShaderFiles(dir: string, results: string[] = []): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const promises: Promise<string[]>[] = []

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      const name = entry.name
      if (name.startsWith('.') || name === 'node_modules' || name === 'build') continue

      const fullPath = join(dir, name)
      if (entry.isDirectory()) {
        promises.push(findShaderFiles(fullPath, results))
      } else if (entry.isFile() && (name.endsWith('.gdshader') || name.endsWith('.gdshaderinc'))) {
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

async function handleCreateShader(projectRoot: string, args: Record<string, unknown>) {
  const shaderPath = args.shader_path as string
  if (!shaderPath) {
    throw new GodotMCPError(
      'No shader_path specified',
      'INVALID_ARGS',
      'Provide shader_path (e.g., "shaders/effect.gdshader").',
    )
  }

  const shaderType = (args.shader_type as string) || 'canvas_item'
  const content = (args.content as string) || SHADER_TEMPLATES[shaderType] || SHADER_TEMPLATES.canvas_item

  const fullPath = safeResolve(projectRoot, shaderPath)

  // Ensure directory exists
  await mkdir(dirname(fullPath), { recursive: true })

  try {
    // 'wx' flag fails if path exists
    await writeFile(fullPath, content, { encoding: 'utf-8', flag: 'wx' })
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new GodotMCPError(`Shader already exists: ${shaderPath}`, 'SHADER_ERROR', 'Use write action to modify.')
    }
    throw error
  }

  return formatSuccess(`Created shader: ${shaderPath} (type: ${shaderType})`)
}

async function handleReadShader(projectRoot: string, args: Record<string, unknown>) {
  const shaderPath = args.shader_path as string
  if (!shaderPath) {
    throw new GodotMCPError('No shader_path specified', 'INVALID_ARGS', 'Provide shader_path.')
  }

  const fullPath = safeResolve(projectRoot, shaderPath)

  try {
    const content = await readFile(fullPath, 'utf-8')
    return formatSuccess(`File: ${shaderPath}\n\n${content}`)
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new GodotMCPError(`Shader not found: ${shaderPath}`, 'SHADER_ERROR', 'Check the file path.')
    }
    throw error
  }
}

async function handleWriteShader(projectRoot: string, args: Record<string, unknown>) {
  const shaderPath = args.shader_path as string
  if (!shaderPath) {
    throw new GodotMCPError('No shader_path specified', 'INVALID_ARGS', 'Provide shader_path.')
  }
  const content = args.content as string
  if (!content) {
    throw new GodotMCPError('No content specified', 'INVALID_ARGS', 'Provide shader content.')
  }

  const fullPath = safeResolve(projectRoot, shaderPath)
  await mkdir(dirname(fullPath), { recursive: true })
  await writeFile(fullPath, content, 'utf-8')
  return formatSuccess(`Written: ${shaderPath} (${content.length} chars)`)
}

async function handleGetShaderParams(projectRoot: string, args: Record<string, unknown>) {
  const shaderPath = args.shader_path as string
  if (!shaderPath) {
    throw new GodotMCPError('No shader_path specified', 'INVALID_ARGS', 'Provide shader_path.')
  }

  const fullPath = safeResolve(projectRoot, shaderPath)

  try {
    const content = await readFile(fullPath, 'utf-8')
    const params: { name: string; type: string; hint?: string; default?: string }[] = []

    const uniformRegex = /uniform\s+(\w+)\s+(\w+)(?:\s*:\s*(\w+(?:\([^)]*\))?))?(?:\s*=\s*([^;]+))?;/g
    for (const match of content.matchAll(uniformRegex)) {
      params.push({
        type: match[1],
        name: match[2],
        hint: match[3],
        default: match[4]?.trim(),
      })
    }

    const typeMatch = content.match(/shader_type\s+(\w+);/)
    return formatJSON({
      shader: shaderPath,
      shaderType: typeMatch?.[1] || 'unknown',
      params,
    })
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new GodotMCPError(`Shader not found: ${shaderPath}`, 'SHADER_ERROR', 'Check the file path.')
    }
    throw error
  }
}

async function handleListShaders(projectRoot: string) {
  const shaders = await findShaderFiles(projectRoot)

  // OPTIMIZATION: Use substring and a pre-allocated array instead of .map() and node:path.relative
  // for significantly faster execution on large arrays of prefixed paths.
  const prefixLen = projectRoot.length + (projectRoot.endsWith('/') || projectRoot.endsWith('\\') ? 0 : 1)
  const relativePaths = new Array(shaders.length)
  for (let i = 0; i < shaders.length; i++) {
    // ⚡ Bolt: Using replaceAll('\\', '/') avoids RegExp allocation overhead
    relativePaths[i] = shaders[i].substring(prefixLen).replaceAll('\\', '/')
  }

  return formatJSON({ project: projectRoot, count: relativePaths.length, shaders: relativePaths })
}

const SHADER_ACTIONS: Record<
  string,
  (
    projectRoot: string,
    args: Record<string, unknown>,
  ) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>
> = {
  create: handleCreateShader,
  read: handleReadShader,
  write: handleWriteShader,
  get_params: handleGetShaderParams,
  list: (projectRoot: string) => handleListShaders(projectRoot),
}

export async function handleShader(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const projectRoot = resolveProjectRoot(args.project_path, config.projectPath)

  const handler = SHADER_ACTIONS[action]
  if (handler) {
    return handler(projectRoot, args)
  }

  throwUnknownAction(action, Object.keys(SHADER_ACTIONS))
}
