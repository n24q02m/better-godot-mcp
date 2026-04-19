"""E2E MCP protocol tool test for better-godot-mcp.

Mode: stdio proxy (http local non-relay default is broken upstream — stateless
StreamableHTTPServerTransport in mcp-core returns 500 on 2nd request; tracked
separately). Calls every tool via MCP stdio transport against source tree.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

REPO_ROOT = Path(__file__).parent.parent
PROJECT_PATH = os.environ.get(
    "GODOT_TEST_PROJECT", str(Path(__file__).parent.parent / "test-project-flags")
)

# Per-tool call plans: list of (label, args) tuples. Tools accept (action, ...extra).
CALL_PLANS: dict[str, list[tuple[str, dict]]] = {
    "config": [
        ("status", {"action": "status"}),
        ("detect_godot", {"action": "detect_godot"}),
        ("check", {"action": "check"}),
        ("set", {"action": "set", "key": "project_path", "value": PROJECT_PATH}),
    ],
    "help": [
        ("help_project", {"tool_name": "project"}),
        ("help_scenes", {"tool_name": "scenes"}),
    ],
    "project": [
        ("version", {"action": "version"}),
        ("info", {"action": "info", "project_path": PROJECT_PATH}),
        ("settings_get", {"action": "settings_get", "project_path": PROJECT_PATH, "key": "application/config/name"}),
    ],
    "scenes": [
        ("list", {"action": "list", "project_path": PROJECT_PATH}),
        ("create", {"action": "create", "project_path": PROJECT_PATH, "scene_path": "scenes/e2e_test.tscn", "root_type": "Node2D", "root_name": "Root"}),
        ("info", {"action": "info", "project_path": PROJECT_PATH, "scene_path": "scenes/e2e_test.tscn"}),
        ("duplicate", {"action": "duplicate", "project_path": PROJECT_PATH, "scene_path": "scenes/e2e_test.tscn", "new_path": "scenes/e2e_test_dup.tscn"}),
        ("delete_dup", {"action": "delete", "project_path": PROJECT_PATH, "scene_path": "scenes/e2e_test_dup.tscn"}),
    ],
    "nodes": [
        ("add", {"action": "add", "project_path": PROJECT_PATH, "scene_path": "scenes/e2e_test.tscn", "name": "Sprite", "type": "Sprite2D", "parent": "."}),
        ("list", {"action": "list", "project_path": PROJECT_PATH, "scene_path": "scenes/e2e_test.tscn"}),
        ("rename", {"action": "rename", "project_path": PROJECT_PATH, "scene_path": "scenes/e2e_test.tscn", "name": "Sprite", "new_name": "Sprite2"}),
        ("set_property", {"action": "set_property", "project_path": PROJECT_PATH, "scene_path": "scenes/e2e_test.tscn", "name": "Sprite2", "property": "position", "value": "Vector2(10, 20)"}),
        ("get_property", {"action": "get_property", "project_path": PROJECT_PATH, "scene_path": "scenes/e2e_test.tscn", "name": "Sprite2", "property": "position"}),
        ("remove", {"action": "remove", "project_path": PROJECT_PATH, "scene_path": "scenes/e2e_test.tscn", "name": "Sprite2"}),
    ],
    "scripts": [
        ("create", {"action": "create", "project_path": PROJECT_PATH, "script_path": "scripts/e2e_test.gd", "extends": "Node"}),
        ("read", {"action": "read", "project_path": PROJECT_PATH, "script_path": "scripts/e2e_test.gd"}),
        ("write", {"action": "write", "project_path": PROJECT_PATH, "script_path": "scripts/e2e_test.gd", "content": "extends Node\n\nfunc _ready():\n\tprint('hello')\n"}),
        ("list", {"action": "list", "project_path": PROJECT_PATH}),
        ("delete", {"action": "delete", "project_path": PROJECT_PATH, "script_path": "scripts/e2e_test.gd"}),
    ],
    "editor": [
        ("status", {"action": "status", "project_path": PROJECT_PATH}),
    ],
    "resources": [
        ("list", {"action": "list", "project_path": PROJECT_PATH}),
    ],
    "input_map": [
        ("list", {"action": "list", "project_path": PROJECT_PATH}),
        ("add_action", {"action": "add_action", "project_path": PROJECT_PATH, "action_name": "e2e_jump", "deadzone": 0.5}),
        ("add_event", {"action": "add_event", "project_path": PROJECT_PATH, "action_name": "e2e_jump", "event_type": "key", "event_value": "KEY_SPACE"}),
        ("remove_action", {"action": "remove_action", "project_path": PROJECT_PATH, "action_name": "e2e_jump"}),
    ],
    "signals": [
        ("list", {"action": "list", "project_path": PROJECT_PATH, "scene_path": "scenes/e2e_test.tscn"}),
    ],
    "animation": [
        ("create_player", {"action": "create_player", "project_path": PROJECT_PATH, "scene_path": "scenes/e2e_test.tscn", "name": "AnimPlayer", "parent": "."}),
        ("list", {"action": "list", "project_path": PROJECT_PATH, "scene_path": "scenes/e2e_test.tscn"}),
    ],
    "tilemap": [
        ("create_tileset", {"action": "create_tileset", "project_path": PROJECT_PATH, "tileset_path": "tilesets/e2e.tres", "tile_size": 16}),
        ("list", {"action": "list", "project_path": PROJECT_PATH, "scene_path": "scenes/e2e_test.tscn"}),
    ],
    "shader": [
        ("create", {"action": "create", "project_path": PROJECT_PATH, "shader_path": "shaders/e2e.gdshader", "shader_type": "canvas_item"}),
        ("read", {"action": "read", "project_path": PROJECT_PATH, "shader_path": "shaders/e2e.gdshader"}),
        ("list", {"action": "list", "project_path": PROJECT_PATH}),
    ],
    "physics": [
        ("layers", {"action": "layers", "project_path": PROJECT_PATH}),
        ("set_layer_name", {"action": "set_layer_name", "project_path": PROJECT_PATH, "dimension": "2d", "layer_number": 1, "name": "e2e_layer"}),
    ],
    "audio": [
        ("list_buses", {"action": "list_buses", "project_path": PROJECT_PATH}),
        ("add_bus", {"action": "add_bus", "project_path": PROJECT_PATH, "bus_name": "E2ETest", "send_to": "Master"}),
    ],
    "navigation": [
        ("create_region", {"action": "create_region", "project_path": PROJECT_PATH, "scene_path": "scenes/e2e_test.tscn", "name": "NavRegion", "parent": ".", "dimension": "2D"}),
    ],
    "ui": [
        ("create_control", {"action": "create_control", "project_path": PROJECT_PATH, "scene_path": "scenes/e2e_test.tscn", "name": "Btn", "type": "Button", "parent": "."}),
        ("list_controls", {"action": "list_controls", "project_path": PROJECT_PATH, "scene_path": "scenes/e2e_test.tscn"}),
    ],
}

# Tools that need to be cleaned up last
FINAL_CLEANUP = [
    ("scenes", "delete", {"action": "delete", "project_path": PROJECT_PATH, "scene_path": "scenes/e2e_test.tscn"}),
]


def short(text: str, n: int = 140) -> str:
    text = text.replace("\n", " ").replace("\r", " ").strip()
    return text if len(text) <= n else text[:n] + "..."


async def call_tool(session: ClientSession, tool: str, args: dict) -> tuple[bool, str]:
    try:
        res = await session.call_tool(tool, args)
        if res.isError:
            body = res.content[0].text if res.content else "<no content>"
            return False, short(body)
        body = res.content[0].text if res.content else ""
        return True, short(body)
    except Exception as e:
        return False, short(f"EXC {type(e).__name__}: {e}")


async def main() -> int:
    print(f"Connecting via stdio (bun run dev:stdio)")
    print(f"Project path: {PROJECT_PATH}")
    results: list[tuple[str, str, bool, str]] = []

    params = StdioServerParameters(
        command="bun",
        args=["x", "tsx", "scripts/start-server.ts", "--stdio"],
        cwd=str(REPO_ROOT),
        env={**os.environ, "MCP_TRANSPORT": "stdio"},
    )
    async with stdio_client(params) as (r, w):
        async with ClientSession(r, w) as s:
            await s.initialize()
            tools = await s.list_tools()
            names = sorted(t.name for t in tools.tools)
            print(f"\nDiscovered {len(names)} tools: {names}\n")

            for tool, plans in CALL_PLANS.items():
                if tool not in names:
                    results.append((tool, "MISSING", False, "tool not in list_tools"))
                    continue
                for label, args in plans:
                    ok, body = await call_tool(s, tool, args)
                    results.append((tool, label, ok, body))
                    status = "PASS" if ok else "FAIL"
                    print(f"[{status}] {tool}.{label}: {body}")

            print("\n--- cleanup ---")
            for tool, label, args in FINAL_CLEANUP:
                ok, body = await call_tool(s, tool, args)
                results.append((tool, label, ok, body))
                status = "PASS" if ok else "FAIL"
                print(f"[{status}] {tool}.{label}: {body}")

    passed = sum(1 for _, _, ok, _ in results if ok)
    total = len(results)
    print(f"\n=== Summary: {passed}/{total} PASS ===")
    # Save JSON report
    report_path = Path(__file__).parent / "e2e_mcp_protocol_report.json"
    report_path.write_text(
        json.dumps(
            {
                "transport": "stdio",
                "project_path": PROJECT_PATH,
                "tool_count": len(names),
                "tools": names,
                "passed": passed,
                "total": total,
                "results": [
                    {"tool": t, "label": l, "ok": ok, "body": b}
                    for t, l, ok, b in results
                ],
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    print(f"Report written to {report_path}")
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
