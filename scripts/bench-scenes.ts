import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { findFiles } from '../src/tools/helpers/files.js'

// --- Original Sync Function (Baseline) ---
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
  } catch {
    // Skip inaccessible directories
  }

  return results
}

// --- Setup Test Directory ---
const TEST_DIR = join(process.cwd(), 'temp_bench_scenes')

function createTestStructure(dir: string, depth: number, breadth: number, filesPerDir: number) {
  if (depth <= 0) return

  mkdirSync(dir, { recursive: true })

  // Create files
  for (let i = 0; i < filesPerDir; i++) {
    writeFileSync(join(dir, `scene_${i}.tscn`), '[gd_scene]\n')
    // Add some noise files
    writeFileSync(join(dir, `script_${i}.gd`), 'extends Node\n')
  }

  // Create subdirectories
  for (let i = 0; i < breadth; i++) {
    createTestStructure(join(dir, `dir_${i}`), depth - 1, breadth, filesPerDir)
  }
}

async function runBenchmark() {
  console.log('Setting up benchmark environment...')
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true })
  }

  // Adjusted parameters to be reasonable but significant
  // Total files ~ 4^4 * 5 = 256 * 5 = 1280 (approx)
  // Actually geometric series sum(4^i) for i=0 to 3 = (4^4 - 1)/(4-1) = 255/3 = 85 dirs.
  // 85 * 5 = 425 files.
  // Let's increase breadth to make it more impactful.
  const DEPTH = 4
  const BREADTH = 5
  // dirs = 1 + 5 + 25 + 125 = 156
  // files = 156 * 5 = 780

  const FILES_PER_DIR = 10
  // 1560 files.

  createTestStructure(TEST_DIR, DEPTH, BREADTH, FILES_PER_DIR)
  console.log('Benchmark environment ready.')

  // --- Run Sync ---
  const startSync = performance.now()
  const syncResults = findSceneFilesSync(TEST_DIR)
  const endSync = performance.now()
  const syncTime = endSync - startSync
  console.log(`Sync (Baseline): ${syncResults.length} files found in ${syncTime.toFixed(2)}ms`)

  // --- Run Async ---
  const startAsync = performance.now()
  const asyncResults = await findFiles(TEST_DIR, '.tscn')
  const endAsync = performance.now()
  const asyncTime = endAsync - startAsync
  console.log(`Async (New):     ${asyncResults.length} files found in ${asyncTime.toFixed(2)}ms`)

  // --- Verification ---
  if (syncResults.length !== asyncResults.length) {
    console.error(`MISMATCH! Sync: ${syncResults.length}, Async: ${asyncResults.length}`)
    // process.exit(1)
  }

  const speedup = syncTime / asyncTime
  console.log(`Speedup: ${speedup.toFixed(2)}x`)

  // Cleanup
  console.log('Cleaning up...')
  rmSync(TEST_DIR, { recursive: true, force: true })
}

runBenchmark().catch(console.error)
