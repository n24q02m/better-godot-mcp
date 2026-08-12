import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

interface RenovateConfig {
  lockFileMaintenance?: {
    commitMessageAction?: string
  }
}

describe('Renovate configuration', () => {
  it('keeps lock-file maintenance titles compatible with the lowercase CI rule', () => {
    const config = JSON.parse(readFileSync(resolve(process.cwd(), 'renovate.json'), 'utf8')) as RenovateConfig

    expect(config.lockFileMaintenance?.commitMessageAction).toBe('lock file maintenance')
  })
})
