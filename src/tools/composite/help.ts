/**
 * Help tool - Full documentation on demand (Standard Tool Set)
 * Loads docs from src/docs/*.md files
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { formatSuccess, GodotMCPError } from '../helpers/errors.js'

const VALID_TOPICS = [
  'project',
  'scenes',
  'nodes',
  'scripts',
  'editor',
  'setup',
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
function getDocsDir(): string {
  const candidates = [
    join(import.meta.dirname || '', '..', '..', 'docs'),
    // Bundled CLI at bin/cli.mjs -> ../src/docs/
    join(import.meta.dirname || '', '..', 'src', 'docs'),
    join(process.cwd(), 'src', 'docs'),
    join(process.cwd(), 'build', 'src', 'docs'),
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }

  return join(process.cwd(), 'src', 'docs')
}

/**
 * Load documentation for a specific tool
 */
function loadDoc(topic: string): string {
  const docsDir = getDocsDir()
  const docPath = join(docsDir, `${topic}.md`)

  if (existsSync(docPath)) {
    return readFileSync(docPath, 'utf-8')
  }

  return `No documentation available for: ${topic}. This tool may not be implemented yet.`
}

export async function handleHelp(action: string, args: Record<string, unknown>) {
  const toolName = (args.tool_name as string) || action

  if (!VALID_TOPICS.includes(toolName as TopicName)) {
    throw new GodotMCPError(`Unknown tool: ${toolName}`, 'INVALID_ARGS', `Valid topics: ${VALID_TOPICS.join(', ')}`)
  }

  const doc = loadDoc(toolName)
  return formatSuccess(doc)
}
