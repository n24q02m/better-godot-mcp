/**
 * Shader tool - Godot shader file management
 * Actions: create | read | write | get_params | list
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError } from '../helpers/errors.js'

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

function findShaderFiles(dir: string): string[] {
  const results: string[] = []
  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      if (entry.startsWith('.') || entry === 'node_modules' || entry === 'build') continue
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        results.push(...findShaderFiles(fullPath))
      } else if (extname(entry) === '.gdshader' || extname(entry) === '.gdshaderinc') {
        results.push(fullPath)
      }
    }
  } catch {
    // Skip inaccessible
  }
  return results
}

export async function handleShader(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const projectPath = (args.project_path as string) || config.projectPath

  switch (action) {
    case 'create': {
      const shaderPath = args.shader_path as string
      if (!shaderPath)
        throw new GodotMCPError(
          'No shader_path specified',
          'INVALID_ARGS',
          'Provide shader_path (e.g., "shaders/effect.gdshader").',
        )
      const shaderType = (args.shader_type as string) || 'canvas_item'
      const content = (args.content as string) || SHADER_TEMPLATES[shaderType] || SHADER_TEMPLATES.canvas_item

      const fullPath = projectPath ? resolve(projectPath, shaderPath) : resolve(shaderPath)
      if (existsSync(fullPath))
        throw new GodotMCPError(`Shader already exists: ${shaderPath}`, 'SHADER_ERROR', 'Use write action to modify.')

      mkdirSync(dirname(fullPath), { recursive: true })
      writeFileSync(fullPath, content, 'utf-8')
      return formatSuccess(`Created shader: ${shaderPath} (type: ${shaderType})`)
    }

    case 'read': {
      const shaderPath = args.shader_path as string
      if (!shaderPath) throw new GodotMCPError('No shader_path specified', 'INVALID_ARGS', 'Provide shader_path.')

      const fullPath = projectPath ? resolve(projectPath, shaderPath) : resolve(shaderPath)
      if (!existsSync(fullPath))
        throw new GodotMCPError(`Shader not found: ${shaderPath}`, 'SHADER_ERROR', 'Check the file path.')

      const content = readFileSync(fullPath, 'utf-8')
      return formatSuccess(`File: ${shaderPath}\n\n${content}`)
    }

    case 'write': {
      const shaderPath = args.shader_path as string
      if (!shaderPath) throw new GodotMCPError('No shader_path specified', 'INVALID_ARGS', 'Provide shader_path.')
      const content = args.content as string
      if (!content) throw new GodotMCPError('No content specified', 'INVALID_ARGS', 'Provide shader content.')

      const fullPath = projectPath ? resolve(projectPath, shaderPath) : resolve(shaderPath)
      mkdirSync(dirname(fullPath), { recursive: true })
      writeFileSync(fullPath, content, 'utf-8')
      return formatSuccess(`Written: ${shaderPath} (${content.length} chars)`)
    }

    case 'get_params': {
      const shaderPath = args.shader_path as string
      if (!shaderPath) throw new GodotMCPError('No shader_path specified', 'INVALID_ARGS', 'Provide shader_path.')

      const fullPath = projectPath ? resolve(projectPath, shaderPath) : resolve(shaderPath)
      if (!existsSync(fullPath))
        throw new GodotMCPError(`Shader not found: ${shaderPath}`, 'SHADER_ERROR', 'Check the file path.')

      const content = readFileSync(fullPath, 'utf-8')
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
    }

    case 'list': {
      if (!projectPath) throw new GodotMCPError('No project path specified', 'INVALID_ARGS', 'Provide project_path.')

      const resolvedPath = resolve(projectPath)
      const shaders = findShaderFiles(resolvedPath)
      const relativePaths = shaders.map((s) => relative(resolvedPath, s).replace(/\\/g, '/'))

      return formatJSON({ project: resolvedPath, count: relativePaths.length, shaders: relativePaths })
    }

    default:
      throw new GodotMCPError(
        `Unknown action: ${action}`,
        'INVALID_ACTION',
        'Valid actions: create, read, write, get_params, list. Use help tool for full docs.',
      )
  }
}
