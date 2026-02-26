import { parseSceneContent } from '../src/tools/helpers/scene-parser.js'

// Generate a large scene content string
function generateLargeScene(nodeCount: number): string {
  const lines: string[] = []
  lines.push('[gd_scene load_steps=1000 format=3 uid="uid://benchmark123"]')
  lines.push('')
  lines.push('[ext_resource type="Script" path="res://benchmark.gd" id="1_bench"]')
  lines.push('')

  for (let i = 0; i < nodeCount; i++) {
    lines.push(`[node name="Node${i}" type="Node2D" parent="${i > 0 ? `Node${i - 1}` : '.'}"]`)
    lines.push(`position = Vector2(${i}, ${i})`)
    lines.push(`rotation = ${i * 0.1}`)
    lines.push(`scale = Vector2(1, 1)`)
    lines.push(`visible = ${i % 2 === 0}`)
    lines.push('')
  }

  return lines.join('\n')
}

async function runBenchmark() {
  const nodeCount = 50000
  console.log(`Generating scene with ${nodeCount} nodes...`)
  const content = generateLargeScene(nodeCount)
  console.log(`Scene content length: ${(content.length / 1024 / 1024).toFixed(2)} MB`)

  // Force GC if possible (not really possible in standard JS without flags, but we wait a bit)
  await new Promise((resolve) => setTimeout(resolve, 100))

  const startMemory = process.memoryUsage().heapUsed
  const startTime = performance.now()

  const parsed = parseSceneContent(content)

  const endTime = performance.now()
  const endMemory = process.memoryUsage().heapUsed

  console.log('--- Benchmark Results ---')
  console.log(`Time: ${(endTime - startTime).toFixed(2)} ms`)
  console.log(`Memory Delta: ${((endMemory - startMemory) / 1024 / 1024).toFixed(2)} MB`)
  console.log(`Parsed Nodes: ${parsed.nodes.length}`)
}

runBenchmark().catch(console.error)
