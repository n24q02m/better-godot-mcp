import sys
import os
import re

filepath = 'tests/godot/detector.test.ts'
with open(filepath, 'r') as f:
    content = f.read()

if "import { join } from 'node:path'" not in content:
    content = "import { join } from 'node:path'\n" + content

# Fix 'should check common Windows paths'
content = content.replace(
    "process.env.ProgramFiles = 'C:\\\\Program Files'",
    "process.env.ProgramFiles = join('C:', 'Program Files')"
)
content = content.replace(
    "path === join('C:', 'Program Files', 'Godot', 'godot.exe')",
    "path === join(process.env.ProgramFiles || '', 'Godot', 'godot.exe')"
)
content = content.replace(
    "cmd === join('C:', 'Program Files', 'Godot', 'godot.exe')",
    "cmd === join(process.env.ProgramFiles || '', 'Godot', 'godot.exe')"
)
content = content.replace(
    "expect(result?.path).toBe(join('C:', 'Program Files', 'Godot', 'godot.exe'))",
    "expect(result?.path).toBe(join(process.env.ProgramFiles || '', 'Godot', 'godot.exe'))"
)

with open(filepath, 'w') as f:
    f.write(content)
