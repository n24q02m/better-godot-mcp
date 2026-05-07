import os

filepath = 'tests/helpers/scene-parser-security.test.ts'
with open(filepath, 'r') as f:
    content = f.read()

injection_test = '''
  it('should not be vulnerable to replacement string injection', () => {
    const content = '[node name="Target" type="Node"]'
    const result = renameNodeInContent(content, 'Target', "$&Hacked")

    // If vulnerable, result will be '[node name="name="Target"Hacked" type="Node"]'
    // Expected: '[node name="$&Hacked" type="Node"]'
    expect(result).toBe('[node name="$&Hacked" type="Node"]')
  })
'''

# Insert before the last closing brace
last_brace_idx = content.rfind('})')
if last_brace_idx != -1:
    new_content = content[:last_brace_idx] + injection_test + content[last_brace_idx:]
    with open(filepath, 'w') as f:
        f.write(new_content)
