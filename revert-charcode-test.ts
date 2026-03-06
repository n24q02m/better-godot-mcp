import { removeNodeFromContent } from './src/tools/helpers/scene-parser.js'

function removeNodeFromContentWithoutCharCodeAt(content: string, nodeName: string): string {
  const searchStr = `name="${nodeName}"`

  if (!content.includes(searchStr)) return content

  const lines = content.split('\n')
  const result: string[] = []
  let skipping = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed === '') {
      if (!skipping) result.push(line)
      continue
    }

    if (trimmed.startsWith('[')) { // '['
      if (trimmed.startsWith('[node') && trimmed.includes(searchStr)) {
        skipping = true
        continue
      } else if (skipping) {
        skipping = false
      }
    }

    if (!skipping) {
      if (trimmed.startsWith('[connection')) {
        if (!trimmed.includes(`from="${nodeName}"`) && !trimmed.includes(`to="${nodeName}"`)) {
          result.push(line)
        }
      } else {
        result.push(line)
      }
    }
  }

  return result.join('\n')
}


function generateScene(numNodes: number): string {
  let content = `[gd_scene load_steps=2 format=3 uid="uid://test"]\n\n`
  for (let i = 0; i < numNodes; i++) {
    content += `[node name="Node${i}" type="Node2D" parent="."]\n`
    content += `position = Vector2(${i}, ${i})\n`
    content += `scale = Vector2(1, 1)\n\n`
  }
  return content
}

const sceneContent = generateScene(10000)

function bench(name: string, fn: () => void) {
  const start = performance.now()
  for (let i = 0; i < 50; i++) {
    fn()
  }
  const end = performance.now()
  console.log(`${name}: ${((end - start) / 50).toFixed(2)} ms / op`)
}

console.log('\n--- Benchmarks ---')
bench('removeNodeFromContent (current charcode)', () => {
  removeNodeFromContent(sceneContent, 'Node5000')
})

bench('removeNodeFromContent (without charcode)', () => {
  removeNodeFromContentWithoutCharCodeAt(sceneContent, 'Node5000')
})
