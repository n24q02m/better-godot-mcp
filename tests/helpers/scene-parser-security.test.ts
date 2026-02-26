import { describe, expect, it } from 'vitest'
import { renameNodeInContent } from '../../src/tools/helpers/scene-parser.js'

describe('scene-parser security', () => {
  it('should not allow regex injection in node renaming', () => {
    const content = `
[node name="TargetNode" type="Node"]
[node name="OtherNode" type="Node"]
`
    // Attempt to use a regex pattern that matches "TargetNode" (and potentially "OtherNode" if not anchored correctly, but here we just want to prove it treats it as regex)
    // "Target.*" matches "TargetNode"
    // If we try to rename "Target.*" to "Renamed", it should NOT match "TargetNode" unless the node is literally named "Target.*"

    // In this case, there is NO node named "Target.*".
    // So if the function is secure, nothing should change.
    // If it is vulnerable, "TargetNode" will be renamed.

    const result = renameNodeInContent(content, 'Target.*', 'Hacked')

    // Vulnerable behavior: "TargetNode" becomes "Hacked"
    // Secure behavior: "TargetNode" remains "TargetNode"

    expect(result).toContain('name="TargetNode"')
    expect(result).not.toContain('name="Hacked"')
  })

  it('should handle special characters in node names correctly', () => {
    const content = `
[node name="Node(1)" type="Node"]
`
    // specific test for parentheses which are regex special chars
    const result = renameNodeInContent(content, 'Node(1)', 'NodeRenamed')

    expect(result).toContain('name="NodeRenamed"')
    expect(result).not.toContain('name="Node(1)"')
  })
})
