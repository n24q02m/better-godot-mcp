import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { handleScenes } from '../src/tools/composite/scenes.js'

const TEMP_DIR = join(process.cwd(), 'temp_bench_scenes')
// 50000 / 3905 approx 13 files per dir
const TOTAL_FILES = 50000
const NESTING_DEPTH = 5
const DIRS_PER_LEVEL = 5
const TOTAL_DIRS = 3905
const FILES_PER_DIR = Math.ceil(TOTAL_FILES / TOTAL_DIRS)

function createStructure(baseDir: string, depth: number) {
  if (depth === 0) return

  for (let i = 0; i < DIRS_PER_LEVEL; i++) {
    const dir = join(baseDir, `dir_${depth}_${i}`)
    mkdirSync(dir, { recursive: true })

    for (let j = 0; j < FILES_PER_DIR; j++) {
      writeFileSync(join(dir, `scene_${j}.tscn`), '')
      writeFileSync(join(dir, `script_${j}.gd`), '')
    }

    createStructure(dir, depth - 1)
  }
}

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

async function runBenchmark() {
  console.log('Setting up benchmark environment...')
  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true, force: true })
  }
  mkdirSync(TEMP_DIR)

  console.log(`Creating directory structure with approx ${TOTAL_FILES} .tscn files and equal number of other files...`)
  console.log(`Files per dir: ${FILES_PER_DIR}`)
  createStructure(TEMP_DIR, NESTING_DEPTH)

  console.log('Starting ASYNC benchmark (new implementation)...')
  const startAsync = performance.now()

  const config = {
    projectPath: TEMP_DIR,
    godotPath: null,
    godotVersion: null,
  }

  await handleScenes('list', { project_path: TEMP_DIR }, config)

  const endAsync = performance.now()
  console.log(`Async benchmark completed in ${(endAsync - startAsync).toFixed(2)}ms`)

  console.log('Starting SYNC benchmark (old implementation)...')
  const startSync = performance.now()

  findSceneFilesSync(TEMP_DIR)

  const endSync = performance.now()
  console.log(`Sync benchmark completed in ${(endSync - startSync).toFixed(2)}ms`)

  console.log('Cleaning up...')
  rmSync(TEMP_DIR, { recursive: true, force: true })
}

runBenchmark().catch(console.error)
