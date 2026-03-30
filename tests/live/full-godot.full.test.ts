/**
 * Full/Real live MCP protocol tests for all 18 tools
 *
 * Spawns the actual MCP server via stdio transport and exercises
 * REAL operations against temp Godot projects. Each describe block
 * creates its own MCP client + temp project, sets project_path via
 * config.set, and cleans up afterwards.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { COMPLEX_TSCN, createTmpProject, createTmpScene, createTmpScript, SAMPLE_SHADER } from '../fixtures.js'

/** Extract text from the first content item of a tool result, stripping security wrapper */
function getText(result: Awaited<ReturnType<Client['callTool']>>): string {
  const raw = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? ''
  // Strip <untrusted_godot_content> wrapper + SECURITY warning added by security.ts
  const match = raw.match(/<untrusted_godot_content>\n([\s\S]*?)\n<\/untrusted_godot_content>/)
  return match ? match[1] : raw
}

/** Parse JSON from tool result text */
function getJSON(result: Awaited<ReturnType<Client['callTool']>>): Record<string, unknown> {
  return JSON.parse(getText(result))
}

/** Create MCP client, connect, and set project_path */
async function setupClient(
  name: string,
  projectPath: string,
): Promise<{ client: Client; transport: StdioClientTransport }> {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['bin/cli.mjs'],
    cwd: process.cwd(),
  })
  const client = new Client({ name, version: '1.0.0' })
  await client.connect(transport)

  // Set project_path via config so tools resolve paths correctly
  await client.callTool({
    name: 'config',
    arguments: { action: 'set', key: 'project_path', value: projectPath },
  })

  return { client, transport }
}

// =============================================
// P0: Core (~26 tests)
// =============================================

describe('P0: project tool', () => {
  let client: Client
  let projectPath: string
  let cleanup: () => void

  beforeAll(async () => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
    const setup = await setupClient('full-test-project', projectPath)
    client = setup.client
  }, 15_000)

  afterAll(async () => {
    await client.close()
    cleanup()
  })

  it('info returns project metadata', async () => {
    const result = await client.callTool({
      name: 'project',
      arguments: { action: 'info' },
    })
    expect(result.isError).toBeFalsy()
    const json = getJSON(result)
    expect(json.name).toBe('TestProject')
    expect(json.mainScene).toBe('res://scenes/main.tscn')
    expect(json).toHaveProperty('configVersion')
    expect(json).toHaveProperty('features')
  })

  it('version returns Godot version string', async () => {
    const result = await client.callTool({
      name: 'project',
      arguments: { action: 'version' },
    })
    // May fail if Godot is not installed -- that is acceptable
    if (!result.isError) {
      const text = getText(result)
      expect(text.toLowerCase()).toContain('godot version')
    } else {
      expect(getText(result).toLowerCase()).toContain('godot')
    }
  })

  it('settings_get reads a setting', async () => {
    const result = await client.callTool({
      name: 'project',
      arguments: { action: 'settings_get', key: 'application/config/name' },
    })
    expect(result.isError).toBeFalsy()
    const json = getJSON(result)
    expect(json.key).toBe('application/config/name')
    // Value may include quotes from project.godot format
    expect(String(json.value).replace(/"/g, '')).toBe('TestProject')
  })

  it('settings_set writes a setting and persists', async () => {
    const result = await client.callTool({
      name: 'project',
      arguments: {
        action: 'settings_set',
        key: 'display/window/size/viewport_width',
        value: '1920',
      },
    })
    expect(result.isError).toBeFalsy()
    expect(getText(result)).toContain('1920')

    // Verify persisted
    const verify = await client.callTool({
      name: 'project',
      arguments: { action: 'settings_get', key: 'display/window/size/viewport_width' },
    })
    const json = getJSON(verify)
    expect(json.value).toBe('1920')
  })
})

describe('P0: scenes tool', () => {
  let client: Client
  let projectPath: string
  let cleanup: () => void

  beforeAll(async () => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
    const setup = await setupClient('full-test-scenes', projectPath)
    client = setup.client
  }, 15_000)

  afterAll(async () => {
    await client.close()
    cleanup()
  })

  it('create -> list -> info -> duplicate -> set_main -> delete', async () => {
    // 1. Create a scene
    const createResult = await client.callTool({
      name: 'scenes',
      arguments: {
        action: 'create',
        scene_path: 'scenes/level1.tscn',
        root_type: 'Node3D',
        root_name: 'Level1',
      },
    })
    expect(createResult.isError).toBeFalsy()
    expect(getText(createResult)).toContain('Created scene')
    expect(getText(createResult)).toContain('Level1')

    // 2. List scenes
    const listResult = await client.callTool({
      name: 'scenes',
      arguments: { action: 'list' },
    })
    expect(listResult.isError).toBeFalsy()
    const listJson = getJSON(listResult)
    expect(listJson.count).toBeGreaterThanOrEqual(1)
    expect(listJson.scenes).toContain('scenes/level1.tscn')

    // 3. Info on scene
    const infoResult = await client.callTool({
      name: 'scenes',
      arguments: { action: 'info', scene_path: 'scenes/level1.tscn' },
    })
    expect(infoResult.isError).toBeFalsy()
    const infoJson = getJSON(infoResult)
    expect(infoJson.rootNode).toBe('Level1')
    expect(infoJson.rootType).toBe('Node3D')
    expect(infoJson.nodeCount).toBe(1)

    // 4. Duplicate the scene
    const dupResult = await client.callTool({
      name: 'scenes',
      arguments: {
        action: 'duplicate',
        scene_path: 'scenes/level1.tscn',
        new_path: 'scenes/level1_copy.tscn',
      },
    })
    expect(dupResult.isError).toBeFalsy()
    expect(getText(dupResult)).toContain('Duplicated')

    // 5. Set main scene
    const setMainResult = await client.callTool({
      name: 'scenes',
      arguments: { action: 'set_main', scene_path: 'scenes/level1.tscn' },
    })
    expect(setMainResult.isError).toBeFalsy()
    expect(getText(setMainResult)).toContain('Set main scene')

    // 6. Delete the copy
    const deleteResult = await client.callTool({
      name: 'scenes',
      arguments: { action: 'delete', scene_path: 'scenes/level1_copy.tscn' },
    })
    expect(deleteResult.isError).toBeFalsy()
    expect(getText(deleteResult)).toContain('Deleted scene')

    // Verify copy is gone
    const listAfter = await client.callTool({
      name: 'scenes',
      arguments: { action: 'list' },
    })
    const afterJson = getJSON(listAfter)
    expect(afterJson.scenes).not.toContain('scenes/level1_copy.tscn')
  })
})

describe('P0: nodes tool', () => {
  let client: Client
  let projectPath: string
  let cleanup: () => void

  beforeAll(async () => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
    createTmpScene(projectPath, 'scenes/test.tscn')
    const setup = await setupClient('full-test-nodes', projectPath)
    client = setup.client
  }, 15_000)

  afterAll(async () => {
    await client.close()
    cleanup()
  })

  it('add -> list -> rename -> set_property -> get_property -> remove', async () => {
    const scenePath = 'scenes/test.tscn'

    // 1. Add a node
    const addResult = await client.callTool({
      name: 'nodes',
      arguments: {
        action: 'add',
        scene_path: scenePath,
        name: 'Player',
        type: 'CharacterBody2D',
        parent: '.',
      },
    })
    expect(addResult.isError).toBeFalsy()
    expect(getText(addResult)).toContain('Added node')
    expect(getText(addResult)).toContain('Player')

    // 2. List nodes
    const listResult = await client.callTool({
      name: 'nodes',
      arguments: { action: 'list', scene_path: scenePath },
    })
    expect(listResult.isError).toBeFalsy()
    const listJson = getJSON(listResult)
    expect(listJson.nodeCount).toBeGreaterThanOrEqual(2) // Root + Player
    const nodes = listJson.nodes as Array<{ name: string; type: string }>
    expect(nodes.some((n) => n.name === 'Player')).toBe(true)

    // 3. Rename the node
    const renameResult = await client.callTool({
      name: 'nodes',
      arguments: {
        action: 'rename',
        scene_path: scenePath,
        name: 'Player',
        new_name: 'Hero',
      },
    })
    expect(renameResult.isError).toBeFalsy()
    expect(getText(renameResult)).toContain('Renamed')

    // 4. Set a property on the renamed node
    const setPropResult = await client.callTool({
      name: 'nodes',
      arguments: {
        action: 'set_property',
        scene_path: scenePath,
        name: 'Hero',
        property: 'speed',
        value: '300',
      },
    })
    expect(setPropResult.isError).toBeFalsy()
    expect(getText(setPropResult)).toContain('Set speed')

    // 5. Get the property back
    const getPropResult = await client.callTool({
      name: 'nodes',
      arguments: {
        action: 'get_property',
        scene_path: scenePath,
        name: 'Hero',
        property: 'speed',
      },
    })
    expect(getPropResult.isError).toBeFalsy()
    const propJson = getJSON(getPropResult)
    expect(propJson.property).toBe('speed')
    expect(propJson.value).toBe('300')

    // 6. Remove the node
    const removeResult = await client.callTool({
      name: 'nodes',
      arguments: { action: 'remove', scene_path: scenePath, name: 'Hero' },
    })
    expect(removeResult.isError).toBeFalsy()
    expect(getText(removeResult)).toContain('Removed')
  })
})

describe('P0: scripts tool', () => {
  let client: Client
  let projectPath: string
  let cleanup: () => void

  beforeAll(async () => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
    createTmpScene(projectPath, 'scenes/main.tscn')
    const setup = await setupClient('full-test-scripts', projectPath)
    client = setup.client
  }, 15_000)

  afterAll(async () => {
    await client.close()
    cleanup()
  })

  it('create -> list -> read -> write -> attach -> delete', async () => {
    // 1. Create a script
    const createResult = await client.callTool({
      name: 'scripts',
      arguments: {
        action: 'create',
        script_path: 'scripts/player.gd',
        extends: 'CharacterBody2D',
      },
    })
    expect(createResult.isError).toBeFalsy()
    expect(getText(createResult)).toContain('Created script')

    // 2. List scripts
    const listResult = await client.callTool({
      name: 'scripts',
      arguments: { action: 'list' },
    })
    expect(listResult.isError).toBeFalsy()
    const listJson = getJSON(listResult)
    expect(listJson.count).toBeGreaterThanOrEqual(1)
    expect(listJson.scripts).toContain('scripts/player.gd')

    // 3. Read the script
    const readResult = await client.callTool({
      name: 'scripts',
      arguments: { action: 'read', script_path: 'scripts/player.gd' },
    })
    expect(readResult.isError).toBeFalsy()
    const readText = getText(readResult)
    expect(readText).toContain('extends CharacterBody2D')

    // 4. Write new content
    const newContent = 'extends CharacterBody2D\n\nvar health := 100\n'
    const writeResult = await client.callTool({
      name: 'scripts',
      arguments: { action: 'write', script_path: 'scripts/player.gd', content: newContent },
    })
    expect(writeResult.isError).toBeFalsy()
    expect(getText(writeResult)).toContain('Written')

    // 5. Attach the script to a scene
    const attachResult = await client.callTool({
      name: 'scripts',
      arguments: {
        action: 'attach',
        scene_path: 'scenes/main.tscn',
        script_path: 'scripts/player.gd',
      },
    })
    expect(attachResult.isError).toBeFalsy()
    expect(getText(attachResult)).toContain('Attached script')

    // 6. Delete the script
    const deleteResult = await client.callTool({
      name: 'scripts',
      arguments: { action: 'delete', script_path: 'scripts/player.gd' },
    })
    expect(deleteResult.isError).toBeFalsy()
    expect(getText(deleteResult)).toContain('Deleted script')
  })
})

describe('P0: editor tool', () => {
  let client: Client

  beforeAll(async () => {
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['bin/cli.mjs'],
      cwd: process.cwd(),
    })
    client = new Client({ name: 'full-test-editor', version: '1.0.0' })
    await client.connect(transport)
  }, 15_000)

  afterAll(async () => {
    await client.close()
  })

  it('status returns process info', async () => {
    const result = await client.callTool({
      name: 'editor',
      arguments: { action: 'status' },
    })
    expect(result.isError).toBeFalsy()
    const json = getJSON(result)
    expect(json).toHaveProperty('running')
    expect(json).toHaveProperty('processes')
    expect(json).toHaveProperty('godotPath')
  })
})

describe('P0: config tool (detect_godot + check)', () => {
  let client: Client

  beforeAll(async () => {
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['bin/cli.mjs'],
      cwd: process.cwd(),
    })
    client = new Client({ name: 'full-test-config-setup', version: '1.0.0' })
    await client.connect(transport)
  }, 15_000)

  afterAll(async () => {
    await client.close()
  })

  it('detect_godot returns structured detection result', async () => {
    const result = await client.callTool({
      name: 'config',
      arguments: { action: 'detect_godot' },
    })
    expect(result.isError).toBeFalsy()
    const json = getJSON(result)
    expect(json).toHaveProperty('found')
    if (json.found) {
      expect(json).toHaveProperty('path')
      expect(json).toHaveProperty('version')
      expect(json).toHaveProperty('source')
    } else {
      expect(json).toHaveProperty('suggestions')
    }
  })

  it('check returns structured check result', async () => {
    const result = await client.callTool({
      name: 'config',
      arguments: { action: 'check' },
    })
    expect(result.isError).toBeFalsy()
    const json = getJSON(result)
    expect(json).toHaveProperty('godot')
    expect(json.godot).toHaveProperty('found')
    expect(json).toHaveProperty('project')
  })
})

describe('P0: config tool', () => {
  let client: Client

  beforeAll(async () => {
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['bin/cli.mjs'],
      cwd: process.cwd(),
    })
    client = new Client({ name: 'full-test-config', version: '1.0.0' })
    await client.connect(transport)
  }, 15_000)

  afterAll(async () => {
    await client.close()
  })

  it('status returns server configuration', async () => {
    const result = await client.callTool({
      name: 'config',
      arguments: { action: 'status' },
    })
    expect(result.isError).toBeFalsy()
    const json = getJSON(result)
    expect(json).toHaveProperty('godot_path')
    expect(json).toHaveProperty('godot_version')
    expect(json).toHaveProperty('project_path')
    expect(json).toHaveProperty('runtime_overrides')
  })
})

// =============================================
// P1: Extended (~11 tests)
// =============================================

describe('P1: resources tool', () => {
  let client: Client
  let projectPath: string
  let cleanup: () => void

  beforeAll(async () => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
    // Create a scene so there is at least one resource
    createTmpScene(projectPath, 'scenes/main.tscn')
    // Create a .tres resource file
    createTmpScript(
      projectPath,
      'resources/theme.tres',
      '[gd_resource type="Theme" format=3]\n\n[resource]\ndefault_font_size = 16\n',
    )
    const setup = await setupClient('full-test-resources', projectPath)
    client = setup.client
  }, 15_000)

  afterAll(async () => {
    await client.close()
    cleanup()
  })

  it('list returns resource files', async () => {
    const result = await client.callTool({
      name: 'resources',
      arguments: { action: 'list' },
    })
    expect(result.isError).toBeFalsy()
    const json = getJSON(result)
    expect(json).toHaveProperty('count')
    expect(json.count as number).toBeGreaterThanOrEqual(1)
    expect(json).toHaveProperty('resources')
  })

  it('info returns resource metadata', async () => {
    const result = await client.callTool({
      name: 'resources',
      arguments: { action: 'info', resource_path: 'resources/theme.tres' },
    })
    expect(result.isError).toBeFalsy()
    const json = getJSON(result)
    expect(json.extension).toBe('.tres')
    expect(json).toHaveProperty('size')
    expect(json).toHaveProperty('modified')
    expect(json.type).toBe('Theme')
  })

  it('import_config returns import info (or no .import found)', async () => {
    const result = await client.callTool({
      name: 'resources',
      arguments: { action: 'import_config', resource_path: 'resources/theme.tres' },
    })
    expect(result.isError).toBeFalsy()
    const text = getText(result)
    // Either shows import config or says no .import file
    expect(text.length).toBeGreaterThan(0)
  })

  it('delete removes a resource file', async () => {
    // Create a disposable resource
    createTmpScript(projectPath, 'resources/disposable.tres', '[gd_resource type="Resource" format=3]\n\n[resource]\n')

    const result = await client.callTool({
      name: 'resources',
      arguments: { action: 'delete', resource_path: 'resources/disposable.tres' },
    })
    expect(result.isError).toBeFalsy()
    expect(getText(result)).toContain('Deleted resource')
  })
})

describe('P1: input_map tool', () => {
  let client: Client
  let projectPath: string
  let cleanup: () => void

  beforeAll(async () => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
    const setup = await setupClient('full-test-input-map', projectPath)
    client = setup.client
  }, 15_000)

  afterAll(async () => {
    await client.close()
    cleanup()
  })

  it('list returns existing input actions', async () => {
    const result = await client.callTool({
      name: 'input_map',
      arguments: { action: 'list' },
    })
    expect(result.isError).toBeFalsy()
    const json = getJSON(result)
    expect(json).toHaveProperty('count')
    expect(json).toHaveProperty('actions')
    // The sample project.godot has move_left, move_right, jump
    expect(json.count as number).toBeGreaterThanOrEqual(3)
  })

  it('add_action -> add_event -> remove_action', async () => {
    // 1. Add a new action
    const addResult = await client.callTool({
      name: 'input_map',
      arguments: { action: 'add_action', action_name: 'shoot', deadzone: 0.2 },
    })
    expect(addResult.isError).toBeFalsy()
    expect(getText(addResult)).toContain('Added input action')
    expect(getText(addResult)).toContain('shoot')

    // 2. Add a key event to the action
    const addEventResult = await client.callTool({
      name: 'input_map',
      arguments: {
        action: 'add_event',
        action_name: 'shoot',
        event_type: 'key',
        event_value: 'KEY_SPACE',
      },
    })
    expect(addEventResult.isError).toBeFalsy()
    expect(getText(addEventResult)).toContain('Added key event')

    // Verify the action now has an event
    const listResult = await client.callTool({
      name: 'input_map',
      arguments: { action: 'list' },
    })
    const listJson = getJSON(listResult)
    const actions = listJson.actions as Array<{ name: string; eventCount: number }>
    const shootAction = actions.find((a) => a.name === 'shoot')
    expect(shootAction).toBeDefined()
    expect(shootAction?.eventCount).toBeGreaterThanOrEqual(1)

    // 3. Remove the action
    const removeResult = await client.callTool({
      name: 'input_map',
      arguments: { action: 'remove_action', action_name: 'shoot' },
    })
    expect(removeResult.isError).toBeFalsy()
    expect(getText(removeResult)).toContain('Removed input action')
  })
})

describe('P1: signals tool', () => {
  let client: Client
  let projectPath: string
  let cleanup: () => void

  beforeAll(async () => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
    // Create a scene with existing connections
    createTmpScene(projectPath, 'scenes/signals_test.tscn', COMPLEX_TSCN)
    const setup = await setupClient('full-test-signals', projectPath)
    client = setup.client
  }, 15_000)

  afterAll(async () => {
    await client.close()
    cleanup()
  })

  it('list returns existing connections', async () => {
    const result = await client.callTool({
      name: 'signals',
      arguments: { action: 'list', scene_path: 'scenes/signals_test.tscn' },
    })
    expect(result.isError).toBeFalsy()
    const json = getJSON(result)
    expect(json).toHaveProperty('count')
    expect(json.count as number).toBeGreaterThanOrEqual(2) // COMPLEX_TSCN has 2 connections
    expect(json).toHaveProperty('connections')
  })

  it('connect -> disconnect', async () => {
    // 1. Connect a new signal
    const connectResult = await client.callTool({
      name: 'signals',
      arguments: {
        action: 'connect',
        scene_path: 'scenes/signals_test.tscn',
        signal: 'tree_entered',
        from: 'Sprite',
        to: 'Player',
        method: '_on_sprite_ready',
      },
    })
    expect(connectResult.isError).toBeFalsy()
    expect(getText(connectResult)).toContain('Connected')

    // Verify it exists
    const listResult = await client.callTool({
      name: 'signals',
      arguments: { action: 'list', scene_path: 'scenes/signals_test.tscn' },
    })
    const listJson = getJSON(listResult)
    const connections = listJson.connections as Array<{ signal: string; from: string; method: string }>
    expect(connections.some((c) => c.method === '_on_sprite_ready')).toBe(true)

    // 2. Disconnect it
    const disconnectResult = await client.callTool({
      name: 'signals',
      arguments: {
        action: 'disconnect',
        scene_path: 'scenes/signals_test.tscn',
        signal: 'tree_entered',
        from: 'Sprite',
        to: 'Player',
        method: '_on_sprite_ready',
      },
    })
    expect(disconnectResult.isError).toBeFalsy()
    expect(getText(disconnectResult)).toContain('Disconnected')
  })
})

// =============================================
// P2: Specialized (~14 tests)
// =============================================

describe('P2: animation tool', () => {
  let client: Client
  let projectPath: string
  let cleanup: () => void

  beforeAll(async () => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
    createTmpScene(projectPath, 'scenes/anim_test.tscn')
    const setup = await setupClient('full-test-animation', projectPath)
    client = setup.client
  }, 15_000)

  afterAll(async () => {
    await client.close()
    cleanup()
  })

  it('create_player adds AnimationPlayer node', async () => {
    const result = await client.callTool({
      name: 'animation',
      arguments: {
        action: 'create_player',
        scene_path: 'scenes/anim_test.tscn',
        name: 'AnimPlayer',
      },
    })
    expect(result.isError).toBeFalsy()
    expect(getText(result)).toContain('Created AnimationPlayer')
  })

  it('add_animation adds an animation sub_resource', async () => {
    const result = await client.callTool({
      name: 'animation',
      arguments: {
        action: 'add_animation',
        scene_path: 'scenes/anim_test.tscn',
        anim_name: 'walk',
        duration: 0.8,
        loop: true,
      },
    })
    expect(result.isError).toBeFalsy()
    expect(getText(result)).toContain('Added animation')
    expect(getText(result)).toContain('walk')
  })

  it('add_track adds a track to animation', async () => {
    const result = await client.callTool({
      name: 'animation',
      arguments: {
        action: 'add_track',
        scene_path: 'scenes/anim_test.tscn',
        anim_name: 'walk',
        track_type: 'value',
        node_path: 'Root',
        property: 'position',
      },
    })
    expect(result.isError).toBeFalsy()
    expect(getText(result)).toContain('Added value track')
  })

  it('add_keyframe returns guidance', async () => {
    const result = await client.callTool({
      name: 'animation',
      arguments: { action: 'add_keyframe', scene_path: 'scenes/anim_test.tscn' },
    })
    expect(result.isError).toBeFalsy()
    expect(getText(result)).toContain('Keyframe')
  })

  it('list shows animations and players', async () => {
    const result = await client.callTool({
      name: 'animation',
      arguments: { action: 'list', scene_path: 'scenes/anim_test.tscn' },
    })
    expect(result.isError).toBeFalsy()
    const json = getJSON(result)
    expect(json).toHaveProperty('players')
    expect(json).toHaveProperty('animations')
    const players = json.players as string[]
    expect(players).toContain('AnimPlayer')
    const animations = json.animations as Array<{ name: string }>
    expect(animations.some((a) => a.name === 'walk')).toBe(true)
  })
})

describe('P2: shader tool', () => {
  let client: Client
  let projectPath: string
  let cleanup: () => void

  beforeAll(async () => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
    const setup = await setupClient('full-test-shader', projectPath)
    client = setup.client
  }, 15_000)

  afterAll(async () => {
    await client.close()
    cleanup()
  })

  it('create -> read -> write -> get_params -> list', async () => {
    // 1. Create a shader
    const createResult = await client.callTool({
      name: 'shader',
      arguments: {
        action: 'create',
        shader_path: 'shaders/effect.gdshader',
        shader_type: 'canvas_item',
      },
    })
    expect(createResult.isError).toBeFalsy()
    expect(getText(createResult)).toContain('Created shader')

    // 2. Read the shader
    const readResult = await client.callTool({
      name: 'shader',
      arguments: { action: 'read', shader_path: 'shaders/effect.gdshader' },
    })
    expect(readResult.isError).toBeFalsy()
    expect(getText(readResult)).toContain('shader_type canvas_item')

    // 3. Write new content with uniforms
    const writeResult = await client.callTool({
      name: 'shader',
      arguments: {
        action: 'write',
        shader_path: 'shaders/effect.gdshader',
        content: SAMPLE_SHADER,
      },
    })
    expect(writeResult.isError).toBeFalsy()
    expect(getText(writeResult)).toContain('Written')

    // 4. Get shader params
    const paramsResult = await client.callTool({
      name: 'shader',
      arguments: { action: 'get_params', shader_path: 'shaders/effect.gdshader' },
    })
    expect(paramsResult.isError).toBeFalsy()
    const paramsJson = getJSON(paramsResult)
    expect(paramsJson.shaderType).toBe('canvas_item')
    expect(paramsJson).toHaveProperty('params')
    const params = paramsJson.params as Array<{ name: string; type: string }>
    expect(params.length).toBeGreaterThanOrEqual(2)
    expect(params.some((p) => p.name === 'tint_color')).toBe(true)
    expect(params.some((p) => p.name === 'intensity')).toBe(true)

    // 5. List shaders
    const listResult = await client.callTool({
      name: 'shader',
      arguments: { action: 'list' },
    })
    expect(listResult.isError).toBeFalsy()
    const listJson = getJSON(listResult)
    expect(listJson.count).toBeGreaterThanOrEqual(1)
    expect(listJson.shaders).toContain('shaders/effect.gdshader')
  })
})

describe('P2: tilemap tool', () => {
  let client: Client
  let projectPath: string
  let cleanup: () => void

  beforeAll(async () => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
    createTmpScene(projectPath, 'scenes/tilemap_test.tscn')
    const setup = await setupClient('full-test-tilemap', projectPath)
    client = setup.client
  }, 15_000)

  afterAll(async () => {
    await client.close()
    cleanup()
  })

  it('create_tileset creates a .tres tileset resource', async () => {
    const result = await client.callTool({
      name: 'tilemap',
      arguments: {
        action: 'create_tileset',
        tileset_path: 'tilesets/main.tres',
        tile_size: 32,
      },
    })
    expect(result.isError).toBeFalsy()
    expect(getText(result)).toContain('Created TileSet')
    expect(getText(result)).toContain('32x32')
  })

  it('list returns tilemap layers in a scene', async () => {
    const result = await client.callTool({
      name: 'tilemap',
      arguments: { action: 'list', scene_path: 'scenes/tilemap_test.tscn' },
    })
    expect(result.isError).toBeFalsy()
    const json = getJSON(result)
    expect(json).toHaveProperty('tilemapLayers')
  })
})

describe('P2: physics tool', () => {
  let client: Client
  let projectPath: string
  let cleanup: () => void

  beforeAll(async () => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
    createTmpScene(projectPath, 'scenes/physics_test.tscn', COMPLEX_TSCN)
    const setup = await setupClient('full-test-physics', projectPath)
    client = setup.client
  }, 15_000)

  afterAll(async () => {
    await client.close()
    cleanup()
  })

  it('layers returns physics layer names', async () => {
    const result = await client.callTool({
      name: 'physics',
      arguments: { action: 'layers' },
    })
    expect(result.isError).toBeFalsy()
    const json = getJSON(result)
    expect(json).toHaveProperty('layers2d')
    expect(json).toHaveProperty('layers3d')
  })

  it('set_layer_name sets a physics layer name', async () => {
    const result = await client.callTool({
      name: 'physics',
      arguments: {
        action: 'set_layer_name',
        layer_number: 1,
        dimension: '2d',
        name: 'player',
      },
    })
    expect(result.isError).toBeFalsy()
    expect(getText(result)).toContain('Set 2d physics layer 1')
    expect(getText(result)).toContain('player')
  })

  it('collision_setup sets collision layer/mask on a node', async () => {
    const result = await client.callTool({
      name: 'physics',
      arguments: {
        action: 'collision_setup',
        scene_path: 'scenes/physics_test.tscn',
        name: 'Player',
        collision_layer: 1,
        collision_mask: 3,
      },
    })
    expect(result.isError).toBeFalsy()
    expect(getText(result)).toContain('Set collision on Player')
  })

  it('body_config sets physics body properties', async () => {
    const result = await client.callTool({
      name: 'physics',
      arguments: {
        action: 'body_config',
        scene_path: 'scenes/physics_test.tscn',
        name: 'Player',
        gravity_scale: 1.5,
        mass: 2.0,
      },
    })
    expect(result.isError).toBeFalsy()
    expect(getText(result)).toContain('Configured physics body')
  })
})

// =============================================
// P3: Advanced (~5 tests)
// =============================================

describe('P3: audio tool', () => {
  let client: Client
  let projectPath: string
  let cleanup: () => void

  beforeAll(async () => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
    const setup = await setupClient('full-test-audio', projectPath)
    client = setup.client
  }, 15_000)

  afterAll(async () => {
    await client.close()
    cleanup()
  })

  it('list_buses returns bus layout', async () => {
    const result = await client.callTool({
      name: 'audio',
      arguments: { action: 'list_buses' },
    })
    expect(result.isError).toBeFalsy()
    const json = getJSON(result)
    expect(json).toHaveProperty('buses')
    const buses = json.buses as Array<{ name: string }>
    // Always has at least Master
    expect(buses.some((b) => b.name === 'Master')).toBe(true)
  })

  it('add_bus creates a new audio bus', async () => {
    const result = await client.callTool({
      name: 'audio',
      arguments: { action: 'add_bus', bus_name: 'SFX', send_to: 'Master' },
    })
    expect(result.isError).toBeFalsy()
    expect(getText(result)).toContain('Added audio bus')
    expect(getText(result)).toContain('SFX')
  })

  it('add_effect adds an audio effect to a bus', async () => {
    const result = await client.callTool({
      name: 'audio',
      arguments: { action: 'add_effect', bus_name: 'SFX', effect_type: 'Reverb' },
    })
    expect(result.isError).toBeFalsy()
    expect(getText(result)).toContain('AudioEffectReverb')
    expect(getText(result)).toContain('SFX')
  })
})

describe('P3: navigation tool', () => {
  let client: Client
  let projectPath: string
  let cleanup: () => void

  beforeAll(async () => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
    createTmpScene(projectPath, 'scenes/nav_test.tscn')
    const setup = await setupClient('full-test-navigation', projectPath)
    client = setup.client
  }, 15_000)

  afterAll(async () => {
    await client.close()
    cleanup()
  })

  it('create_region adds a NavigationRegion node', async () => {
    const result = await client.callTool({
      name: 'navigation',
      arguments: {
        action: 'create_region',
        scene_path: 'scenes/nav_test.tscn',
        name: 'NavRegion',
        dimension: '2D',
      },
    })
    expect(result.isError).toBeFalsy()
    expect(getText(result)).toContain('Created navigation region')
    expect(getText(result)).toContain('NavigationRegion2D')
  })
})

describe('P3: ui tool', () => {
  let client: Client
  let projectPath: string
  let cleanup: () => void

  beforeAll(async () => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
    createTmpScene(projectPath, 'scenes/ui_test.tscn')
    const setup = await setupClient('full-test-ui', projectPath)
    client = setup.client
  }, 15_000)

  afterAll(async () => {
    await client.close()
    cleanup()
  })

  it('create_control adds a UI control node', async () => {
    const result = await client.callTool({
      name: 'ui',
      arguments: {
        action: 'create_control',
        scene_path: 'scenes/ui_test.tscn',
        name: 'StartButton',
        type: 'Button',
        parent: '.',
      },
    })
    expect(result.isError).toBeFalsy()
    expect(getText(result)).toContain('Created UI control')
    expect(getText(result)).toContain('StartButton')
  })

  it('list_controls returns control nodes', async () => {
    const result = await client.callTool({
      name: 'ui',
      arguments: { action: 'list_controls', scene_path: 'scenes/ui_test.tscn' },
    })
    expect(result.isError).toBeFalsy()
    const json = getJSON(result)
    expect(json).toHaveProperty('controls')
    expect(json).toHaveProperty('count')
    const controls = json.controls as Array<{ name: string; type: string }>
    expect(controls.some((c) => c.name === 'StartButton')).toBe(true)
  })
})
