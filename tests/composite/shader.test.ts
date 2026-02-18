/**
 * Integration tests for Shader tool
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleShader } from '../../src/tools/composite/shader.js'
import { createTmpProject, makeConfig, SAMPLE_SHADER } from '../fixtures.js'

describe('shader', () => {
  let projectPath: string
  let cleanup: () => void
  let config: GodotConfig

  beforeEach(() => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
    config = makeConfig({ projectPath })
  })

  afterEach(() => cleanup())

  const createShaderFile = (name: string, content = SAMPLE_SHADER) => {
    const { mkdirSync, writeFileSync } = require('node:fs') as typeof import('node:fs')
    const dir = join(projectPath, 'shaders')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, name), content, 'utf-8')
  }

  // ==========================================
  // create
  // ==========================================
  describe('create', () => {
    it('should create canvas_item shader by default', async () => {
      const result = await handleShader(
        'create',
        {
          project_path: projectPath,
          shader_path: 'shaders/effect.gdshader',
        },
        config,
      )

      expect(result.content[0].text).toContain('Created shader')
      const content = readFileSync(join(projectPath, 'shaders/effect.gdshader'), 'utf-8')
      expect(content).toContain('shader_type canvas_item')
    })

    it('should create spatial shader', async () => {
      await handleShader(
        'create',
        {
          project_path: projectPath,
          shader_path: 'shaders/3d.gdshader',
          shader_type: 'spatial',
        },
        config,
      )

      const content = readFileSync(join(projectPath, 'shaders/3d.gdshader'), 'utf-8')
      expect(content).toContain('shader_type spatial')
      expect(content).toContain('ALBEDO')
    })

    it('should create particles shader', async () => {
      await handleShader(
        'create',
        {
          project_path: projectPath,
          shader_path: 'shaders/particles.gdshader',
          shader_type: 'particles',
        },
        config,
      )

      const content = readFileSync(join(projectPath, 'shaders/particles.gdshader'), 'utf-8')
      expect(content).toContain('shader_type particles')
    })

    it('should throw if shader already exists', async () => {
      createShaderFile('existing.gdshader')
      await expect(
        handleShader(
          'create',
          {
            project_path: projectPath,
            shader_path: 'shaders/existing.gdshader',
          },
          config,
        ),
      ).rejects.toThrow('already exists')
    })
  })

  // ==========================================
  // read
  // ==========================================
  describe('read', () => {
    it('should read shader content', async () => {
      createShaderFile('test.gdshader')

      const result = await handleShader(
        'read',
        {
          project_path: projectPath,
          shader_path: 'shaders/test.gdshader',
        },
        config,
      )

      expect(result.content[0].text).toContain('shader_type canvas_item')
    })

    it('should throw for missing shader', async () => {
      await expect(
        handleShader(
          'read',
          {
            project_path: projectPath,
            shader_path: 'shaders/ghost.gdshader',
          },
          config,
        ),
      ).rejects.toThrow('not found')
    })
  })

  // ==========================================
  // write
  // ==========================================
  describe('write', () => {
    it('should write shader content', async () => {
      const newContent = 'shader_type sky;\nvoid sky() { COLOR = vec3(0.0); }\n'
      await handleShader(
        'write',
        {
          project_path: projectPath,
          shader_path: 'shaders/sky.gdshader',
          content: newContent,
        },
        config,
      )

      const content = readFileSync(join(projectPath, 'shaders/sky.gdshader'), 'utf-8')
      expect(content).toBe(newContent)
    })
  })

  // ==========================================
  // get_params
  // ==========================================
  describe('get_params', () => {
    it('should extract uniforms from shader', async () => {
      createShaderFile('params.gdshader')

      const result = await handleShader(
        'get_params',
        {
          project_path: projectPath,
          shader_path: 'shaders/params.gdshader',
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      expect(data.shaderType).toBe('canvas_item')
      expect(data.params.length).toBeGreaterThan(0)

      // Verify all uniforms are parsed, including Godot 4 `: source_color` syntax
      const tintParam = data.params.find((p: { name: string }) => p.name === 'tint_color')
      expect(tintParam).toBeDefined()
      expect(tintParam.type).toBe('vec4')
      expect(tintParam.hint).toBe('source_color')

      const intensityParam = data.params.find((p: { name: string }) => p.name === 'intensity')
      expect(intensityParam).toBeDefined()
      expect(intensityParam.type).toBe('float')

      const noiseParam = data.params.find((p: { name: string }) => p.name === 'noise_tex')
      expect(noiseParam).toBeDefined()
      expect(noiseParam.hint).toBe('hint_default_white')
    })

    it('should return empty params for shader without uniforms', async () => {
      createShaderFile('basic.gdshader', 'shader_type canvas_item;\nvoid fragment() {}\n')

      const result = await handleShader(
        'get_params',
        {
          project_path: projectPath,
          shader_path: 'shaders/basic.gdshader',
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      expect(data.params).toHaveLength(0)
    })
  })

  // ==========================================
  // list
  // ==========================================
  describe('list', () => {
    it('should find shader files', async () => {
      createShaderFile('a.gdshader')
      createShaderFile('b.gdshader')

      const result = await handleShader(
        'list',
        {
          project_path: projectPath,
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      expect(data.count).toBe(2)
    })

    it('should return empty list when no shaders', async () => {
      const result = await handleShader(
        'list',
        {
          project_path: projectPath,
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      expect(data.count).toBe(0)
    })
  })

  it('should throw for unknown action', async () => {
    await expect(handleShader('invalid', {}, config)).rejects.toThrow('Unknown action')
  })
})
