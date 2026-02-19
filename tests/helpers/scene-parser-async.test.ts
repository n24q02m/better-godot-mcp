import { unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseScene } from '../../src/tools/helpers/scene-parser.js'

const TEST_SCENE_CONTENT = `[gd_scene load_steps=1 format=3 uid="uid://test"]

[node name="Root" type="Node"]
prop = "value"
`

describe('parseScene (async)', () => {
  const tempFile = join(tmpdir(), 'test_scene.tscn')

  beforeEach(() => {
    writeFileSync(tempFile, TEST_SCENE_CONTENT)
  })

  afterEach(() => {
    try {
      unlinkSync(tempFile)
    } catch {}
  })

  it('should parse scene file asynchronously', async () => {
    const scene = await parseScene(tempFile)
    expect(scene.header.uid).toBe('uid://test')
    expect(scene.nodes).toHaveLength(1)
    expect(scene.nodes[0].name).toBe('Root')
    expect(scene.nodes[0].properties.prop).toBe('"value"')
  })
})
