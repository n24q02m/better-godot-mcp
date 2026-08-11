/**
 * Real (unmocked) doc-content coverage -- catches the tool surface (registry.ts action
 * enum) drifting from src/docs/*.md. See help.test.ts for the (mocked) loading mechanism.
 */
import { describe, expect, it } from 'vitest'
import { handleHelp, VALID_HELP_TOPICS } from '../../src/tools/composite/help.js'

describe('help documentation contract', () => {
  it('returns overview.md when no topic is supplied', async () => {
    const result = await handleHelp()
    const text = result.content[0].text

    expect(text).toMatch(/^# /)
    expect(text).toContain('Available Topics')
  })

  it('documents the logs action and its pid param', async () => {
    const result = await handleHelp('project')
    const text = result.content[0].text

    expect(text).toContain('### logs')
    expect(text).toContain('pid')
  })

  it.each(VALID_HELP_TOPICS)('has a markdown document for topic %s', async (topic) => {
    const result = await handleHelp(topic)
    const text = result.content[0].text

    expect(text).toMatch(/^# /)
  })
})
