import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import type { GodotConfig } from '../src/godot/types.js'
import { handleScenes } from '../src/tools/composite/scenes.js'

async function runBench() {
  const tmpDir = join(process.cwd(), 'tmp-bench')
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
  mkdirSync(tmpDir, { recursive: true })

  const scenePath = join(tmpDir, 'bench.tscn')
  const config: GodotConfig = { projectPath: tmpDir, godotPath: 'godot' }

  // Create a large scene file (10k nodes)
  const lines = ['[gd_scene format=3]', '[node name="Root" type="Node2D"]']
  for (let i = 0; i < 10000; i++) {
    lines.push(`[node name="Node${i}" type="Node2D" parent="Root"]`)
    lines.push(`position = Vector2(${i}, ${i})`)
  }
  writeFileSync(scenePath, lines.join('\n'))

  console.log('Starting sequential benchmark...')
  const start = performance.now()

  const iterations = 10
  for (let i = 0; i < iterations; i++) {
    await handleScenes('info', { project_path: tmpDir, scene_path: 'bench.tscn' }, config)
  }

  const end = performance.now()
  const avg = (end - start) / iterations

  console.log(`Average time to parse 10k nodes (${iterations} iterations): ${avg.toFixed(2)}ms`)

  console.log('Starting concurrent benchmark...')
  const startConcurrent = performance.now()
  const promises = []
  for (let i = 0; i < iterations; i++) {
    promises.push(handleScenes('info', { project_path: tmpDir, scene_path: 'bench.tscn' }, config))
  }
  await Promise.all(promises)
  const endConcurrent = performance.now()
  console.log(
    `Time to parse 10k nodes concurrently (${iterations} ops): ${(endConcurrent - startConcurrent).toFixed(2)}ms`,
  )

  // Clean up
  rmSync(tmpDir, { recursive: true, force: true })
}

runBench().catch(console.error)
