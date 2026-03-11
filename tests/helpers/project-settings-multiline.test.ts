import { describe, expect, it } from 'vitest'
import { parseProjectSettingsContent } from '../../src/tools/helpers/project-settings.js'

describe('project-settings multiline', () => {
  it('should parse multiline values', () => {
    const content = `[input]
action={
"deadzone": 0.5,
"events": [
  Object(InputEventKey,"keycode":65)
]
}
other=123`
    const settings = parseProjectSettingsContent(content)
    const input = settings.sections.get('input')
    expect(input?.get('action')).toBe('{\n"deadzone": 0.5,\n"events": [\n  Object(InputEventKey,"keycode":65)\n]\n}')
    expect(input?.get('other')).toBe('123')
  })
})
