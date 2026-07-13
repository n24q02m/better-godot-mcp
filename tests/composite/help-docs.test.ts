/**
 * Real (unmocked) doc-content coverage -- catches the tool surface (registry.ts action
 * enum) drifting from src/docs/*.md. See help.test.ts for the (mocked) loading mechanism.
 */
import { describe, expect, it } from 'vitest'
import { handleHelp } from '../../src/tools/composite/help.js'

describe('help(project) doc content', () => {
  it('documents the logs action and its pid param', async () => {
    const result = await handleHelp('project', {})
    const text = result.content[0].text

    expect(text).toContain('### logs')
    expect(text).toContain('pid')
  })
})
