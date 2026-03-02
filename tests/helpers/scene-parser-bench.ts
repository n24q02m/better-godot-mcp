import { renameNodeInContent } from '../../src/tools/helpers/scene-parser.js'
import { performance } from 'node:perf_hooks'

// Generate a large tscn file
let largeContent = '[gd_scene load_steps=1 format=3 uid="uid://test"]\n\n'
for (let i = 0; i < 5000; i++) {
  largeContent += `[node name="Node${i}" type="Node" parent="ParentNode"]\n`
  largeContent += `property${i} = "value${i}"\n\n`
  largeContent += `[connection signal="pressed" from="Node${i}" to="Node${i}" method="_on_pressed"]\n\n`
}

function benchmark() {
  const start = performance.now()
  for (let i = 0; i < 1000; i++) {
    // Modify slightly different nodes to ensure no caching masks the cost
    renameNodeInContent(largeContent, `Node${i}`, `RenamedNode${i}`)
  }
  const end = performance.now()
  console.log(`Time taken: ${(end - start).toFixed(2)} ms`)
}

benchmark()
