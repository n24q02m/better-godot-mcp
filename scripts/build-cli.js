import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { build } from 'esbuild'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))

/**
 * Copy directory recursively
 */
function copyDir(src, dest) {
  if (!existsSync(src)) return
  mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry)
    const destPath = join(dest, entry)
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

async function buildCli() {
  // Bundle src into single CLI file
  await build({
    entryPoints: ['src/init-server.ts'],
    bundle: true,
    platform: 'node',
    target: 'node24',
    format: 'esm',
    outfile: 'bin/cli.mjs',
    external: ['@modelcontextprotocol/sdk'],
    banner: {
      js: [
        '#!/usr/bin/env node',
        `// ${pkg.name} v${pkg.version}`,
        '// Auto-generated CLI bundle - do not edit directly',
        '',
      ].join('\n'),
    },
    minify: false,
    sourcemap: false,
  })

  // Copy documentation files for help tool
  copyDir('src/docs', 'build/src/docs')

  console.log(`Built CLI: bin/cli.mjs (${pkg.name} v${pkg.version})`)
}

buildCli().catch((err) => {
  console.error('Build failed:', err)
  process.exit(1)
})
