/**
 * Shader tool - Godot shader file management
 * Actions: create | read | write | get_params | list
 */

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
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

async function findShaderFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const promises = entries.map(async (entry) => {
      const name = entry.name
      if (name.startsWith('.') || name === 'node_modules' || name === 'build') return []
      const fullPath = join(dir, name)

      if (entry.isDirectory()) {
        return findShaderFiles(fullPath)
      } else if (entry.isFile() && (extname(name) === '.gdshader' || extname(name) === '.gdshaderinc')) {
        return [fullPath]
      }
      return []
    })

    const nestedResults = await Promise.all(promises)
    return nestedResults.flat()
  } catch {
    // Skip inaccessible
    return []
  }
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

      // Ensure directory exists
      await mkdir(dirname(fullPath), { recursive: true })

      try {
        // 'wx' flag fails if path exists
        await writeFile(fullPath, content, { encoding: 'utf-8', flag: 'wx' })
      } catch (error: any) {
        if (error.code === 'EEXIST') {
          throw new GodotMCPError(`Shader already exists: ${shaderPath}`, 'SHADER_ERROR', 'Use write action to modify.')
        }
        throw error
      }

      return formatSuccess(`Created shader: ${shaderPath} (type: ${shaderType})`)
    }

    case 'read': {
      const shaderPath = args.shader_path as string
      if (!shaderPath) throw new GodotMCPError('No shader_path specified', 'INVALID_ARGS', 'Provide shader_path.')

      const fullPath = projectPath ? resolve(projectPath, shaderPath) : resolve(shaderPath)

      try {
        const content = await readFile(fullPath, 'utf-8')
        return formatSuccess(`File: ${shaderPath}\n\n${content}`)
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          throw new GodotMCPError(`Shader not found: ${shaderPath}`, 'SHADER_ERROR', 'Check the file path.')
        }
        throw error
      }
    }

    case 'write': {
      const shaderPath = args.shader_path as string
      if (!shaderPath) throw new GodotMCPError('No shader_path specified', 'INVALID_ARGS', 'Provide shader_path.')
      const content = args.content as string
      if (!content) throw new GodotMCPError('No content specified', 'INVALID_ARGS', 'Provide shader content.')

      const fullPath = projectPath ? resolve(projectPath, shaderPath) : resolve(shaderPath)
      await mkdir(dirname(fullPath), { recursive: true })
      await writeFile(fullPath, content, 'utf-8')
      return formatSuccess(`Written: ${shaderPath} (${content.length} chars)`)
    }

    case 'get_params': {
      const shaderPath = args.shader_path as string
      if (!shaderPath) throw new GodotMCPError('No shader_path specified', 'INVALID_ARGS', 'Provide shader_path.')

      const fullPath = projectPath ? resolve(projectPath, shaderPath) : resolve(shaderPath)

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
      } catch (error: any) {
         if (error.code === 'ENOENT') {
          throw new GodotMCPError(`Shader not found: ${shaderPath}`, 'SHADER_ERROR', 'Check the file path.')
        }
        throw error
      }
    }

    case 'list': {
      if (!projectPath) throw new GodotMCPError('No project path specified', 'INVALID_ARGS', 'Provide project_path.')

      const resolvedPath = resolve(projectPath)
      const shaders = await findShaderFiles(resolvedPath)
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
