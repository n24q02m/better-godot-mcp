import { execFileSync } from 'node:child_process'
import { existsSync, lstatSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..')
const addonPath = 'addons/better_godot_mcp'
const requiredFiles = [
  'plugin.cfg',
  'better_godot_mcp.gd',
  'better_godot_mcp_dock.gd',
  'README.md',
  'LICENSE',
  'icon.png',
]

function parseOutputPath(args, version) {
  const outputIndex = args.indexOf('--output')

  if (outputIndex >= 0) {
    const output = args[outputIndex + 1]
    if (!output || output.startsWith('--')) {
      throw new Error('--output requires a file path')
    }
    return resolve(output)
  }

  const unexpected = args.filter((arg) => arg !== '--output')
  if (unexpected.length > 0) {
    throw new Error(`Unexpected argument: ${unexpected[0]}`)
  }

  return join(repoRoot, 'dist', 'godot-asset-store', `better-godot-mcp-${version}.zip`)
}

function assertCleanWorktree() {
  const status = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim()

  if (status) {
    throw new Error('Asset Store packaging requires a clean worktree; commit the source first')
  }
}

function assertRequiredAddonFiles() {
  for (const file of requiredFiles) {
    const absolutePath = join(repoRoot, addonPath, file)
    if (!existsSync(absolutePath) || !lstatSync(absolutePath).isFile()) {
      throw new Error(`Required addon file is missing or not a regular file: ${addonPath}/${file}`)
    }
  }
}

function readAddonVersion() {
  const manifest = readFileSync(join(repoRoot, addonPath, 'plugin.cfg'), 'utf8')
  const match = manifest.match(/^version="([^"]+)"$/m)

  if (!match) {
    throw new Error('plugin.cfg must declare a quoted version')
  }

  return match[1]
}

function buildArchive(outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true })
  execFileSync('git', ['archive', '--format=zip', '--worktree-attributes', '--output', outputPath, 'HEAD', addonPath], {
    cwd: repoRoot,
    stdio: 'pipe',
  })

  if (!existsSync(outputPath) || statSync(outputPath).size === 0) {
    throw new Error(`Git produced no archive at ${outputPath}`)
  }
}

const version = readAddonVersion()
const outputPath = parseOutputPath(process.argv.slice(2), version)
assertCleanWorktree()
assertRequiredAddonFiles()
buildArchive(outputPath)

process.stdout.write(`Godot Asset Store archive: ${relative(repoRoot, outputPath)}\n`)
