#!/usr/bin/env node

/**
 * Cross-platform script to setup Python virtual environment
 *
 * This script handles the "Access is denied" error on Windows
 * which occurs when VSCode Python extension or other processes lock files
 *
 * Strategy:
 * 1. Try to remove existing .venv
 * 2. If removal fails (file locked), check if venv is still usable
 * 3. Create new venv only if needed
 */

import { execSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const venvPath = join(process.cwd(), '.venv')

const log = (msg) => process.stderr.write(`[better-godot-mcp] ${msg}\n`)
const warn = (msg) => process.stderr.write(`[better-godot-mcp] WARN: ${msg}\n`)
const error = (msg) => process.stderr.write(`[better-godot-mcp] ERROR: ${msg}\n`)

/**
 * Check if the existing venv is usable
 */
function isVenvUsable() {
  const pythonPath =
    process.platform === 'win32' ? join(venvPath, 'Scripts', 'python.exe') : join(venvPath, 'bin', 'python')

  if (!existsSync(pythonPath)) {
    return false
  }

  try {
    execSync(`"${pythonPath}" --version`, { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

/**
 * Try to remove the venv directory
 */
function tryRemoveVenv() {
  if (!existsSync(venvPath)) {
    return true // Nothing to remove
  }

  log('Attempting to remove existing .venv directory...')
  try {
    rmSync(venvPath, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 1000,
    })
    log('Successfully removed .venv')
    return true
  } catch (err) {
    warn(`Could not fully remove .venv: ${err.message}`)
    return false
  }
}

/**
 * Create a new venv using uv
 */
function createVenv() {
  log('Creating new virtual environment...')
  try {
    execSync('uv venv', { stdio: 'inherit' })
    log('Virtual environment created successfully')
    return true
  } catch (err) {
    error(`Failed to create venv: ${err.message}`)
    return false
  }
}

// Main logic
const wasRemoved = tryRemoveVenv()

if (wasRemoved) {
  // .venv was removed or didn't exist, create fresh
  if (!createVenv()) {
    process.exit(1)
  }
} else {
  // Couldn't remove .venv, check if it's still usable
  if (isVenvUsable()) {
    log('Existing .venv is still usable, skipping recreation.')
    log('Note: Some files may be locked by VSCode or other processes.')
    log("If you experience issues, close VSCode and run 'mise run setup' again.")
  } else {
    warn('Warning: .venv exists but is not usable, and we cannot remove it.')
    warn("Skipping venv setup. Please close VSCode and run 'mise run setup' again if needed.")
    // Don't fail the entire setup, just warn and continue
  }
}
