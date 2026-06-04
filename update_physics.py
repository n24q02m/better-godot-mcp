import sys

with open('src/tools/composite/physics.ts', 'r') as f:
    content = f.read()

# Try with fewer lines and more flexible matching if needed,
# but let's try one more time being extremely careful about the backslashes.
# In the file it is: new RegExp(`(\\[node name="${escapeRegExp(nodeName)}"[^\\]]*\\])`)
# Python raw string might help.

search_collision = """      let content = await readFile(fullPath, 'utf-8')
      const nodeRegex = new RegExp(`(\\\\[node name="${escapeRegExp(nodeName)}"[^\\\\]]*\\\\])`)
      const match = content.match(nodeRegex)
      if (!match) throw new GodotMCPError(`Node "${nodeName}" not found`, 'NODE_ERROR', 'Check node name.')

      if (match.index === undefined)
        throw new GodotMCPError(`Node "${nodeName}" not found`, 'NODE_ERROR', 'Check node name.')
      const insertPoint = match.index + match[0].length
      let props = ''
      if (collisionLayer !== undefined) {
        const val = toGodotValue(collisionLayer)
        validateNoNewlines('Invalid collision_layer: newlines not allowed', val)
        props += `\\ncollision_layer = ${val}`
      }
      if (collisionMask !== undefined) {
        const val = toGodotValue(collisionMask)
        validateNoNewlines('Invalid collision_mask: newlines not allowed', val)
        props += `\\ncollision_mask = ${val}`
      }

      content = `${content.slice(0, insertPoint)}${props}${content.slice(insertPoint)}`
      await writeFile(fullPath, content, 'utf-8')"""

# Wait, in the cat -A output:
# props += `\ncollision_layer = ${val}`$
# That is a SINGLE backslash in the file, followed by n.
# So in Python string it should be \\n to represent \n in the file.

replace_collision = """      const content = await readFile(fullPath, 'utf-8')
      const updates: Record<string, string> = {}
      if (collisionLayer !== undefined) {
        const val = toGodotValue(collisionLayer)
        validateNoNewlines('Invalid collision_layer: newlines not allowed', val)
        updates.collision_layer = val
      }
      if (collisionMask !== undefined) {
        const val = toGodotValue(collisionMask)
        validateNoNewlines('Invalid collision_mask: newlines not allowed', val)
        updates.collision_mask = val
      }

      const { content: newContent, updated } = updateNodeInScene(content, nodeName, updates)
      if (!updated) throw new GodotMCPError(`Node "${nodeName}" not found`, 'NODE_ERROR', 'Check node name.')

      if (newContent !== content) {
        await writeFile(fullPath, newContent, 'utf-8')
      }"""

if search_collision in content:
    content = content.replace(search_collision, replace_collision)
    print("Successfully replaced collision_setup")
else:
    # If not found, let's try to find a substring to see where it fails
    sub = """      let content = await readFile(fullPath, 'utf-8')
      const nodeRegex = new RegExp(`(\\\\[node name="${escapeRegExp(nodeName)}"[^\\\\]]*\\\\])`)"""
    if sub in content:
        print("Found partial match (header)")
    else:
        print("Header not found")
    print("search_collision not found")

search_body = """      let content = await readFile(fullPath, 'utf-8')
      const nodeRegex = new RegExp(`(\\\\[node name="${escapeRegExp(nodeName)}"[^\\\\]]*\\\\])`)
      const match = content.match(nodeRegex)
      if (!match) throw new GodotMCPError(`Node "${nodeName}" not found`, 'NODE_ERROR', 'Check node name.')

      let props = ''
      const physicsProps = ['gravity_scale', 'mass', 'linear_damp', 'angular_damp', 'freeze']
      for (const prop of physicsProps) {
        if (args[prop] !== undefined) {
          const val = toGodotValue(args[prop])
          validateNoNewlines(`Invalid ${prop}: newlines not allowed`, val)
          props += `\\n${prop} = ${val}`
        }
      }

      if (match.index === undefined)
        throw new GodotMCPError(`Node "${nodeName}" not found`, 'NODE_ERROR', 'Check node name.')
      const insertPoint = match.index + match[0].length
      content = `${content.slice(0, insertPoint)}${props}${content.slice(insertPoint)}`
      await writeFile(fullPath, content, 'utf-8')"""

replace_body = """      const content = await readFile(fullPath, 'utf-8')
      const updates: Record<string, string> = {}
      const physicsProps = ['gravity_scale', 'mass', 'linear_damp', 'angular_damp', 'freeze']
      for (const prop of physicsProps) {
        if (args[prop] !== undefined) {
          const val = toGodotValue(args[prop])
          validateNoNewlines(`Invalid ${prop}: newlines not allowed`, val)
          updates[prop] = val
        }
      }

      const { content: newContent, updated } = updateNodeInScene(content, nodeName, updates)
      if (!updated) throw new GodotMCPError(`Node "${nodeName}" not found`, 'NODE_ERROR', 'Check node name.')

      if (newContent !== content) {
        await writeFile(fullPath, newContent, 'utf-8')
      }"""

if search_body in content:
    content = content.replace(search_body, replace_body)
    print("Successfully replaced body_config")
else:
    print("search_body not found")

with open('src/tools/composite/physics.ts', 'w') as f:
    f.write(content)
