import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleNodes } from '../../src/tools/composite/nodes.js'

describe('Nodes Tool Security', () => {
  const projectPath = join(process.cwd(), 'tmp_security_nodes_test')
  const config: GodotConfig = { projectPath }

  beforeEach(() => {
    mkdirSync(projectPath, { recursive: true })
    writeFileSync(join(projectPath, 'project.godot'), '[config]')
    writeFileSync(join(projectPath, 'scene.tscn'), '[gd_scene format=3]\n\n[node name="Root" type="Node"]\n')
  })

  afterEach(() => {
    rmSync(projectPath, { recursive: true, force: true })
  })

  async function expectRejectedWithoutSceneChange(
    action: 'add' | 'remove' | 'rename' | 'set_property' | 'get_property',
    args: Record<string, unknown>,
    message: string,
  ) {
    const scenePath = join(projectPath, 'scene.tscn')
    const original = readFileSync(scenePath, 'utf-8')

    await expect(handleNodes(action, { scene_path: 'scene.tscn', ...args }, config)).rejects.toThrow(message)

    expect(readFileSync(scenePath, 'utf-8')).toBe(original)
  }

  it('should prevent injection in node name (add)', async () => {
    const maliciousName = 'Root" type="Injected" parent=".'

    await expect(
      handleNodes(
        'add',
        {
          scene_path: 'scene.tscn',
          name: maliciousName,
          type: 'Node',
        },
        config,
      ),
    ).rejects.toThrow('Invalid node name')

    const content = readFileSync(join(projectPath, 'scene.tscn'), 'utf-8')
    expect(content).not.toContain('type="Injected"')
  })

  it('should reject non-string node names before interpolation', async () => {
    await expect(
      handleNodes(
        'add',
        {
          scene_path: 'scene.tscn',
          name: ['NewNode\n[node name="Injected" type="Node"]'],
          type: 'Node',
        },
        config,
      ),
    ).rejects.toThrow('Invalid node name')
  })

  it('should prevent injection in node type (add)', async () => {
    const maliciousType = 'Node" parent="." injected="true'

    await expect(
      handleNodes(
        'add',
        {
          scene_path: 'scene.tscn',
          name: 'NewNode',
          type: maliciousType,
        },
        config,
      ),
    ).rejects.toThrow('Invalid node type')

    const content = readFileSync(join(projectPath, 'scene.tscn'), 'utf-8')
    expect(content).not.toContain('injected="true"')
  })

  it('should prevent injection in parent path (add)', async () => {
    const maliciousParent = 'Root" injected="true'

    await expect(
      handleNodes(
        'add',
        {
          scene_path: 'scene.tscn',
          name: 'NewNode',
          parent: maliciousParent,
        },
        config,
      ),
    ).rejects.toThrow('Invalid parent path')

    const content = readFileSync(join(projectPath, 'scene.tscn'), 'utf-8')
    expect(content).not.toContain('injected="true"')
  })

  it('should prevent injection in property key (add)', async () => {
    const maliciousKey = 'some_prop = 1\n[node name="Injected" type="Node"]\nunused'

    await expect(
      handleNodes(
        'add',
        {
          scene_path: 'scene.tscn',
          name: 'NewNode',
          properties: {
            [maliciousKey]: 'value',
          },
        },
        config,
      ),
    ).rejects.toThrow('Invalid property key')

    const content = readFileSync(join(projectPath, 'scene.tscn'), 'utf-8')
    expect(content).not.toContain('[node name="Injected"')
  })

  it('should prevent injection in property value (add) via newline', async () => {
    const maliciousValue = '123\n[node name="Injected" type="Node"]'

    await expect(
      handleNodes(
        'add',
        {
          scene_path: 'scene.tscn',
          name: 'NewNode',
          type: 'Node',
          properties: {
            some_prop: maliciousValue,
          },
        },
        config,
      ),
    ).rejects.toThrow('Invalid property value')

    const content = readFileSync(join(projectPath, 'scene.tscn'), 'utf-8')
    expect(content).not.toContain('[node name="Injected"')
  })

  it('should prevent injection in new_name (rename)', async () => {
    const maliciousName = 'Root" type="Injected" parent=".'

    await expect(
      handleNodes(
        'rename',
        {
          scene_path: 'scene.tscn',
          name: 'Root',
          new_name: maliciousName,
        },
        config,
      ),
    ).rejects.toThrow('Invalid node name')

    const content = readFileSync(join(projectPath, 'scene.tscn'), 'utf-8')
    expect(content).not.toContain('type="Injected"')
  })

  it('should prevent injection in property key (set_property)', async () => {
    const maliciousKey = 'some_prop = 1\n[node name="Injected" type="Node"]\nunused'

    await expect(
      handleNodes(
        'set_property',
        {
          scene_path: 'scene.tscn',
          name: 'Root',
          property: maliciousKey,
          value: '123',
        },
        config,
      ),
    ).rejects.toThrow('Invalid property key')

    const content = readFileSync(join(projectPath, 'scene.tscn'), 'utf-8')
    expect(content).not.toContain('[node name="Injected"')
  })

  it('should prevent injection in property value (set_property) via newline', async () => {
    const maliciousValue = '123\n[node name="Injected" type="Node"]'

    await expect(
      handleNodes(
        'set_property',
        {
          scene_path: 'scene.tscn',
          name: 'Root',
          property: 'some_prop',
          value: maliciousValue,
        },
        config,
      ),
    ).rejects.toThrow('Invalid property value')

    const content = readFileSync(join(projectPath, 'scene.tscn'), 'utf-8')
    expect(content).not.toContain('[node name="Injected"')
  })

  it('rejects raw node type and parent values before add defaults without changing the scene', async () => {
    for (const [field, value, message] of [
      ['type', false, 'Invalid node type'],
      ['type', 0, 'Invalid node type'],
      ['type', [], 'Invalid node type'],
      ['parent', false, 'Invalid parent path'],
      ['parent', 0, 'Invalid parent path'],
      ['parent', {}, 'Invalid parent path'],
    ] as const) {
      await expectRejectedWithoutSceneChange('add', { name: 'NewNode', [field]: value }, message)
    }
  })

  it('preserves explicit empty node type and parent instead of defaulting them', async () => {
    await handleNodes(
      'add',
      {
        scene_path: 'scene.tscn',
        name: 'NewNode',
        type: '',
        parent: '',
      },
      config,
    )

    expect(readFileSync(join(projectPath, 'scene.tscn'), 'utf-8')).toContain('[node name="NewNode" type="" parent=""]')
  })

  it('rejects raw node names before normalization without changing the scene', async () => {
    await expectRejectedWithoutSceneChange('remove', { name: false }, 'Invalid node name')
    await expectRejectedWithoutSceneChange('rename', { name: 0, new_name: 'Renamed' }, 'Invalid node name')
    await expectRejectedWithoutSceneChange(
      'set_property',
      { name: [], property: 'visible', value: 'true' },
      'Invalid node name',
    )
    await expectRejectedWithoutSceneChange('get_property', { name: {}, property: 'visible' }, 'Invalid node name')
  })

  it('rejects null and non-string property values before interpolation without changing the scene', async () => {
    for (const value of [false, 0, null, [], {}]) {
      await expectRejectedWithoutSceneChange(
        'set_property',
        { name: 'Root', property: 'visible', value },
        'Invalid property value',
      )
    }
  })
})
