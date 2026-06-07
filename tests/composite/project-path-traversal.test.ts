/**
 * Security: Out-of-project access/delete via unvalidated `project_path`.
 *
 * Reproduces the responsibly-disclosed report (Zhihao Zhang, WPI): several tool
 * handlers used the caller-supplied `project_path` directly as the `safeResolve`
 * base without first confining it to the operator-configured trusted root. A
 * caller could point `project_path` at an arbitrary directory and
 * read / write / delete files outside the intended Godot project (CWE-22/23).
 *
 * The trusted boundary is `config.projectPath` (falling back to the server's
 * working directory). An attacker-controlled `project_path` that escapes that
 * boundary MUST be rejected before any filesystem operation runs.
 */

import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleAnimation } from '../../src/tools/composite/animation.js'
import { handleAudio } from '../../src/tools/composite/audio.js'
import { handleNavigation } from '../../src/tools/composite/navigation.js'
import { handleResources } from '../../src/tools/composite/resources.js'
import { handleShader } from '../../src/tools/composite/shader.js'
import { handleSignals } from '../../src/tools/composite/signals.js'
import { handleTilemap } from '../../src/tools/composite/tilemap.js'
import { handleUI } from '../../src/tools/composite/ui.js'

const MINIMAL_SCENE = '[gd_scene format=3]\n\n[node name="Root" type="Node2D"]\n'

describe('Security: out-of-project access via unvalidated project_path', () => {
  let root: string
  let trustedProject: string
  let outsideDir: string
  let secretFile: string
  let outsideScene: string
  let config: GodotConfig

  beforeEach(async () => {
    // realpath up front so the macOS firmlink layout (/var -> /private/var) of
    // the OS temp dir does not confuse the containment assertions.
    root = await realpath(await mkdtemp(join(tmpdir(), 'godot-mcp-pptrav-')))
    trustedProject = join(root, 'project')
    outsideDir = join(root, 'outside')
    await mkdir(trustedProject)
    await mkdir(outsideDir)
    await writeFile(join(trustedProject, 'project.godot'), '[application]\nconfig/name="Trusted"\n')
    secretFile = join(outsideDir, 'secret.tres')
    await writeFile(secretFile, '[gd_resource type="Resource" format=3]\n')
    outsideScene = join(outsideDir, 'victim.tscn')
    await writeFile(outsideScene, MINIMAL_SCENE)
    // Server is configured with the trusted project as its boundary.
    config = { godotPath: null, godotVersion: null, projectPath: trustedProject, activePids: [] }
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  const escapeRe = /Access denied|outside the project root/

  it('resources.delete refuses to delete a file outside the project', async () => {
    await expect(
      handleResources('delete', { project_path: outsideDir, resource_path: 'secret.tres' }, config),
    ).rejects.toThrow(escapeRe)
    expect(existsSync(secretFile)).toBe(true)
  })

  it('resources.info refuses to read a file outside the project', async () => {
    await expect(
      handleResources('info', { project_path: outsideDir, resource_path: 'secret.tres' }, config),
    ).rejects.toThrow(escapeRe)
  })

  it('resources.import_config refuses to read outside the project', async () => {
    await expect(
      handleResources('import_config', { project_path: outsideDir, resource_path: 'secret.tres' }, config),
    ).rejects.toThrow(escapeRe)
  })

  it('shader.write refuses to create a file outside the project', async () => {
    await expect(
      handleShader('write', { project_path: outsideDir, shader_path: 'pwned.gdshader', content: 'x' }, config),
    ).rejects.toThrow(escapeRe)
    expect(existsSync(join(outsideDir, 'pwned.gdshader'))).toBe(false)
  })

  it('shader.create refuses to create a file outside the project', async () => {
    await expect(
      handleShader('create', { project_path: outsideDir, shader_path: 'pwned.gdshader' }, config),
    ).rejects.toThrow(escapeRe)
    expect(existsSync(join(outsideDir, 'pwned.gdshader'))).toBe(false)
  })

  it('shader.read refuses to read a file outside the project', async () => {
    await expect(
      handleShader('read', { project_path: outsideDir, shader_path: 'secret.tres' }, config),
    ).rejects.toThrow(escapeRe)
  })

  it('ui.set_theme refuses to write a file outside the project', async () => {
    await expect(handleUI('set_theme', { project_path: outsideDir, theme_path: 'pwned.tres' }, config)).rejects.toThrow(
      escapeRe,
    )
    expect(existsSync(join(outsideDir, 'pwned.tres'))).toBe(false)
  })

  it('tilemap.create_tileset refuses to write a file outside the project', async () => {
    await expect(
      handleTilemap('create_tileset', { project_path: outsideDir, tileset_path: 'pwned.tres' }, config),
    ).rejects.toThrow(escapeRe)
    expect(existsSync(join(outsideDir, 'pwned.tres'))).toBe(false)
  })

  it('animation.create_player refuses to modify a scene outside the project', async () => {
    await expect(
      handleAnimation('create_player', { project_path: outsideDir, scene_path: 'victim.tscn' }, config),
    ).rejects.toThrow(escapeRe)
  })

  it('navigation.create_region refuses to modify a scene outside the project', async () => {
    await expect(
      handleNavigation('create_region', { project_path: outsideDir, scene_path: 'victim.tscn' }, config),
    ).rejects.toThrow(escapeRe)
  })

  it('audio.create_stream refuses to modify a scene outside the project', async () => {
    await expect(
      handleAudio('create_stream', { project_path: outsideDir, scene_path: 'victim.tscn' }, config),
    ).rejects.toThrow(escapeRe)
  })

  it('signals.list refuses to read a scene outside the project', async () => {
    await expect(
      handleSignals('list', { project_path: outsideDir, scene_path: 'victim.tscn' }, config),
    ).rejects.toThrow(escapeRe)
  })

  it('still allows operations inside the trusted project (no false positives)', async () => {
    // Sanity: a legitimate in-project shader write succeeds.
    await expect(
      handleShader(
        'write',
        { project_path: trustedProject, shader_path: 'fx.gdshader', content: 'shader_type canvas_item;' },
        config,
      ),
    ).resolves.toBeDefined()
    expect(existsSync(join(trustedProject, 'fx.gdshader'))).toBe(true)
  })
})
