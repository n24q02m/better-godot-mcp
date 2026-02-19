import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { findFiles } from '../../src/tools/helpers/files.js'
import { createTmpProject, createTmpScene, createTmpScript } from '../fixtures.js'

describe('files', () => {
  let projectPath: string
  let cleanup: () => void

  beforeEach(() => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
  })

  afterEach(() => cleanup())

  it('should find all files recursively', async () => {
    createTmpScene(projectPath, 'main.tscn')
    createTmpScript(projectPath, 'scripts/player.gd')
    mkdirSync(join(projectPath, 'assets'))
    writeFileSync(join(projectPath, 'assets/icon.png'), 'fake-png')

    const files = await findFiles(projectPath, null)
    const relative = files.map((f) => f.replace(projectPath, '').replace(/^[/\\]/, '').replace(/\\/g, '/'))

    expect(relative).toContain('main.tscn')
    expect(relative).toContain('scripts/player.gd')
    expect(relative).toContain('assets/icon.png')
    expect(relative).toContain('project.godot')
  })

  it('should filter by extension', async () => {
    createTmpScene(projectPath, 'main.tscn')
    createTmpScript(projectPath, 'scripts/player.gd')

    const files = await findFiles(projectPath, new Set(['.gd']))
    const relative = files.map((f) => f.replace(projectPath, '').replace(/^[/\\]/, '').replace(/\\/g, '/'))

    expect(relative).toContain('scripts/player.gd')
    expect(relative).not.toContain('main.tscn')
    expect(relative).not.toContain('project.godot')
  })

  it('should ignore specified directories', async () => {
    createTmpScript(projectPath, 'scripts/player.gd')
    mkdirSync(join(projectPath, 'build'))
    createTmpScript(projectPath, 'build/output.gd')

    const files = await findFiles(projectPath, new Set(['.gd']), new Set(['build']))
    const relative = files.map((f) => f.replace(projectPath, '').replace(/^[/\\]/, '').replace(/\\/g, '/'))

    expect(relative).toContain('scripts/player.gd')
    expect(relative).not.toContain('build/output.gd')
  })

  it('should ignore hidden files and directories', async () => {
    createTmpScript(projectPath, 'visible.gd')
    createTmpScript(projectPath, '.hidden.gd')
    mkdirSync(join(projectPath, '.git'))
    createTmpScript(projectPath, '.git/config')

    const files = await findFiles(projectPath, null)
    const relative = files.map((f) => f.replace(projectPath, '').replace(/^[/\\]/, '').replace(/\\/g, '/'))

    expect(relative).toContain('visible.gd')
    expect(relative).not.toContain('.hidden.gd')
    expect(relative).not.toContain('.git/config')
  })

  it('should handle nested ignores', async () => {
    mkdirSync(join(projectPath, 'libs'))
    mkdirSync(join(projectPath, 'libs/node_modules'))
    createTmpScript(projectPath, 'libs/node_modules/bad.gd')
    createTmpScript(projectPath, 'libs/good.gd')

    const files = await findFiles(projectPath, new Set(['.gd']), new Set(['node_modules']))
    const relative = files.map((f) => f.replace(projectPath, '').replace(/^[/\\]/, '').replace(/\\/g, '/'))

    expect(relative).toContain('libs/good.gd')
    expect(relative).not.toContain('libs/node_modules/bad.gd')
  })
})
