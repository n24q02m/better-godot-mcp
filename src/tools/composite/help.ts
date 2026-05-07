/**
 * Help tool - Full documentation on demand (Standard Tool Set)
 * Loads docs from src/docs/*.md files
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { formatSuccess, GodotMCPError } from '../helpers/errors.js'
import { pathExists } from '../helpers/paths.js'

const VALID_TOPICS = [
  'project',
  'scenes',
  'nodes',
  'scripts',
  'editor',
  'config',
  'help',
  'resources',
  'input_map',
  'signals',
  'animation',
  'tilemap',
  'shader',
  'physics',
  'audio',
  'navigation',
  'ui',
] as const
type TopicName = (typeof VALID_TOPICS)[number]

/**
 * Get the docs directory path
 */
async function getDocsDir(): Promise<string> {
  const candidates = [
    join(import.meta.dirname || '', '..', '..', 'docs'),
    // Bundled CLI at bin/cli.mjs -> ../build/src/docs/
    join(import.meta.dirname || '', '..', 'build', 'src', 'docs'),
    // Dev mode fallback
    join(import.meta.dirname || '', '..', 'src', 'docs'),
    join(process.cwd(), 'src', 'docs'),
    join(process.cwd(), 'build', 'src', 'docs'),
  ]

  const results = await Promise.all(
    candidates.map(async (candidate) => {
      // Validate candidate contains actual tool docs (not a random 'docs' directory)
      const markerFile = join(candidate, 'help.md')
      const exists = await pathExists(markerFile)
      return exists ? candidate : null
    }),
  )

  const found = results.find((res) => res !== null)
  if (found) return found

  return join(process.cwd(), 'src', 'docs')
}

/**
 * Load documentation for a specific tool
 */
async function loadDoc(topic: string): Promise<string> {
  const docsDir = await getDocsDir()
  const docPath = join(docsDir, `${topic}.md`)

  // Performance optimization: using async file reading instead of sync
  // to avoid blocking the Node.js event loop during I/O operations
  if (await pathExists(docPath)) {
    return await readFile(docPath, 'utf-8')
  }

  return `No documentation available for: ${topic}. This tool may not be implemented yet.`
}

export async function handleHelp(action: string, args: Record<string, unknown>) {
  const toolName = (args.tool_name as string) || action

  if (!VALID_TOPICS.includes(toolName as TopicName)) {
    throw new GodotMCPError(`Unknown tool: ${toolName}`, 'INVALID_ARGS', `Valid topics: ${VALID_TOPICS.join(', ')}`)
  }

  const doc = await loadDoc(toolName)
  return formatSuccess(doc)
}
