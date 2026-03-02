import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { extname, join } from 'node:path'

// Original synchronous version
function findSceneFilesSync(dir: string): string[] {
  const results: string[] = []
  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      if (entry.startsWith('.') || entry === 'node_modules' || entry === 'build') continue
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        results.push(...findSceneFilesSync(fullPath))
      } else if (extname(entry) === '.tscn') {
        results.push(fullPath)
      }
    }
  } catch {}
  return results
}

// New asynchronous version
async function findSceneFilesAsync(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const promises = entries.map(async (entry) => {
      const name = entry.name
      if (name.startsWith('.') || name === 'node_modules' || name === 'build') return []

      const fullPath = join(dir, name)

      if (entry.isDirectory()) {
        return findSceneFilesAsync(fullPath)
      } else if (entry.isFile() && extname(name) === '.tscn') {
        return [fullPath]
      }
      return []
    })

    const nestedResults = await Promise.all(promises)
    return nestedResults.flat()
  } catch {
    return []
  }
}

async function runBenchmark() {
  const rootDir = join(tmpdir(), `godot-benchmark-${Date.now()}`)
  mkdirSync(rootDir, { recursive: true })

  console.log('Generating test structure...')
  const numDirs = 100
  const numFilesPerDir = 50

  for (let i = 0; i < numDirs; i++) {
    const dirPath = join(rootDir, `folder_${i}`)
    mkdirSync(dirPath, { recursive: true })
    for (let j = 0; j < numFilesPerDir; j++) {
      const isScene = Math.random() > 0.5
      const ext = isScene ? '.tscn' : '.gd'
      writeFileSync(join(dirPath, `file_${j}${ext}`), 'test data')
    }
  }

  // Warmup
  findSceneFilesSync(rootDir)
  await findSceneFilesAsync(rootDir)

  console.log('Running benchmark...')
  const iterations = 20

  let syncTime = 0
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    findSceneFilesSync(rootDir)
    syncTime += performance.now() - start
  }

  let asyncTime = 0
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    await findSceneFilesAsync(rootDir)
    asyncTime += performance.now() - start
  }

  console.log(`Sync time (avg): ${(syncTime / iterations).toFixed(2)}ms`)
  console.log(`Async time (avg): ${(asyncTime / iterations).toFixed(2)}ms`)
  console.log(`Improvement: ${(((syncTime - asyncTime) / syncTime) * 100).toFixed(2)}%`)

  rmSync(rootDir, { recursive: true, force: true })
}

runBenchmark().catch(console.error)
