import { access } from 'node:fs/promises'
import { describe, expect, it, vi } from 'vitest'
import { pathExists } from '../../src/tools/helpers/paths.js'

/**
 * Unit tests for the error handling path of pathExists.
 * This separate file is used because mocking node:fs/promises
 * can interfere with other tests that rely on the real filesystem.
 */

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
}))

describe('pathExists error path', () => {
  it('returns false when access throws an error', async () => {
    const mockedAccess = vi.mocked(access)
    // Simulate any error (e.g., EPERM, EACCES, or just a generic Error)
    mockedAccess.mockRejectedValueOnce(new Error('Permission denied'))

    const result = await pathExists('/any/path/that/might/fail')
    expect(result).toBe(false)
    expect(mockedAccess).toHaveBeenCalledWith('/any/path/that/might/fail')
  })

  it('returns true when access succeeds', async () => {
    const mockedAccess = vi.mocked(access)
    mockedAccess.mockResolvedValueOnce(undefined)

    const result = await pathExists('/any/existing/path')
    expect(result).toBe(true)
    expect(mockedAccess).toHaveBeenCalledWith('/any/existing/path')
  })
})
