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

  console.log('Attempting to remove existing .venv directory...')
  try {
    rmSync(venvPath, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 1000,
    })
    console.log('Successfully removed .venv')
    return true
  } catch (error) {
    console.warn(`Could not fully remove .venv: ${error.message}`)
    return false
  }
}

/**
 * Create a new venv using uv
 */
function createVenv() {
  console.log('Creating new virtual environment...')
  try {
    execSync('uv venv', { stdio: 'inherit' })
    console.log('Virtual environment created successfully')
    return true
  } catch (error) {
    console.error(`Failed to create venv: ${error.message}`)
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
    console.log('Existing .venv is still usable, skipping recreation.')
    console.log('Note: Some files may be locked by VSCode or other processes.')
    console.log("If you experience issues, close VSCode and run 'mise run setup' again.")
  } else {
    console.warn('Warning: .venv exists but is not usable, and we cannot remove it.')
    console.warn("Skipping venv setup. Please close VSCode and run 'mise run setup' again if needed.")
    // Don't fail the entire setup, just warn and continue
  }
}
