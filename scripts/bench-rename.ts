import { renameNodeInContent } from '../src/tools/helpers/scene-parser.js'

// Generate a large scene content
function generateScene(nodeCount: number): string {
  let content = `[gd_scene load_steps=${nodeCount} format=3 uid="uid://bench"]\n\n`

  // Create a hierarchy where 'TargetNode' is the parent of many nodes
  // and is referenced in connections

  content += `[node name="TargetNode" type="Node2D"]\n`

  for (let i = 0; i < nodeCount; i++) {
    content += `[node name="Child_${i}" type="Sprite2D" parent="TargetNode"]\n`
    content += `position = Vector2(${i}, ${i})\n`
    content += `[node name="GrandChild_${i}" type="Node" parent="TargetNode/Child_${i}"]\n`

    // Add some connections
    if (i % 5 === 0) {
      content += `[connection signal="ready" from="TargetNode" to="TargetNode/Child_${i}" method="_on_ready"]\n`
      content += `[connection signal="process" from="TargetNode/Child_${i}" to="TargetNode" method="_on_process"]\n`
    }
  }

  return content
}

const content = generateScene(2000)
const iterations = 100

console.log(`Benchmarking renameNodeInContent with ${content.length} characters, ${iterations} iterations...`)

const start = performance.now()

for (let i = 0; i < iterations; i++) {
  // We don't use the result to avoid GC overhead affecting measurement too much,
  // but we must ensure the engine doesn't optimize it away.
  const res = renameNodeInContent(content, 'TargetNode', 'NewTargetNode')
  if (res.length < content.length) {
    throw new Error('Unexpected result length')
  }
}

const end = performance.now()
const totalTime = end - start
const avgTime = totalTime / iterations

console.log(`Total time: ${totalTime.toFixed(2)}ms`)
console.log(`Average time per call: ${avgTime.toFixed(4)}ms`)
