#!/usr/bin/env python3
"""E2E test for better-godot-mcp HTTP transport.

Runs all 17 tools via streamable HTTP + MCP ClientSession.
Requires:
  - GODOT_BASE_URL env var (e.g. http://127.0.0.1:61157)
  - a Godot test project at GODOT_PROJECT_PATH (fallback /tmp/godot-e2e-project)
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
from typing import Any

from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client


BASE_URL = os.environ.get("GODOT_BASE_URL", "http://127.0.0.1:61157").rstrip("/")
PROJECT_PATH = os.environ.get("GODOT_PROJECT_PATH", "/tmp/godot-e2e-project")


def short(text: str, limit: int = 140) -> str:
    text = text.replace("\n", " ").strip()
    return text if len(text) <= limit else text[: limit - 1] + "..."


def summarize(result: Any) -> tuple[bool, str]:
    try:
        is_error = bool(getattr(result, "isError", False))
        content = getattr(result, "content", []) or []
        texts: list[str] = []
        for item in content:
            if hasattr(item, "text") and item.text:
                texts.append(str(item.text))
            elif isinstance(item, dict) and item.get("text"):
                texts.append(str(item["text"]))
        summary = short(" | ".join(texts) if texts else repr(result))
        return (not is_error), summary
    except Exception as exc:  # pragma: no cover
        return False, f"summarize-error: {exc}"


async def call_tool(session: ClientSession, name: str, args: dict[str, Any]) -> tuple[bool, str]:
    try:
        result = await session.call_tool(name, arguments=args)
        return summarize(result)
    except Exception as exc:
        return False, f"client-exception: {exc}"


def project_args(extra: dict[str, Any] | None = None) -> dict[str, Any]:
    base = {"project_path": PROJECT_PATH}
    if extra:
        base.update(extra)
    return base


async def main() -> int:
    url = f"{BASE_URL}/mcp"
    print(f"# connecting to {url}")
    print(f"# project_path={PROJECT_PATH}")

    scenarios: list[tuple[str, str, dict[str, Any]]] = [
        ("config", "status", {"action": "status"}),
        ("config", "detect_godot", {"action": "detect_godot"}),
        ("config", "check", {"action": "check"}),
        ("help", "help_config", {"tool_name": "config"}),
        ("project", "info", {"action": "info", "project_path": PROJECT_PATH}),
        ("project", "version", {"action": "version", "project_path": PROJECT_PATH}),
        ("project", "settings_get", {"action": "settings_get", "key": "application/config/name", "project_path": PROJECT_PATH}),
        ("project", "settings_set", {"action": "settings_set", "key": "application/config/description", "value": "e2e-test-desc", "project_path": PROJECT_PATH}),
        ("scenes", "create", {"action": "create", "scene_path": "scenes/main.tscn", "root_type": "Node2D", "root_name": "Main", "project_path": PROJECT_PATH}),
        ("scenes", "list", {"action": "list", "project_path": PROJECT_PATH}),
        ("scenes", "info", {"action": "info", "scene_path": "scenes/main.tscn", "project_path": PROJECT_PATH}),
        ("scenes", "set_main", {"action": "set_main", "scene_path": "scenes/main.tscn", "project_path": PROJECT_PATH}),
        ("scenes", "duplicate", {"action": "duplicate", "scene_path": "scenes/main.tscn", "new_path": "scenes/main_dup.tscn", "project_path": PROJECT_PATH}),
        ("nodes", "add", {"action": "add", "scene_path": "scenes/main.tscn", "name": "Player", "type": "Node2D", "parent": ".", "project_path": PROJECT_PATH}),
        ("nodes", "list", {"action": "list", "scene_path": "scenes/main.tscn", "project_path": PROJECT_PATH}),
        ("nodes", "set_property", {"action": "set_property", "scene_path": "scenes/main.tscn", "name": "Player", "property": "position", "value": "Vector2(10, 20)", "project_path": PROJECT_PATH}),
        ("nodes", "get_property", {"action": "get_property", "scene_path": "scenes/main.tscn", "name": "Player", "property": "position", "project_path": PROJECT_PATH}),
        ("nodes", "rename", {"action": "rename", "scene_path": "scenes/main.tscn", "name": "Player", "new_name": "Hero", "project_path": PROJECT_PATH}),
        ("nodes", "remove", {"action": "remove", "scene_path": "scenes/main.tscn", "name": "Hero", "project_path": PROJECT_PATH}),
        ("scripts", "create", {"action": "create", "script_path": "scripts/player.gd", "extends": "Node2D", "project_path": PROJECT_PATH}),
        ("scripts", "read", {"action": "read", "script_path": "scripts/player.gd", "project_path": PROJECT_PATH}),
        ("scripts", "write", {"action": "write", "script_path": "scripts/player.gd", "content": "extends Node2D\n\nfunc _ready():\n\tpass\n", "project_path": PROJECT_PATH}),
        ("scripts", "list", {"action": "list", "project_path": PROJECT_PATH}),
        ("scripts", "delete", {"action": "delete", "script_path": "scripts/player.gd", "project_path": PROJECT_PATH}),
        ("editor", "status", {"action": "status", "project_path": PROJECT_PATH}),
        ("resources", "list", {"action": "list", "project_path": PROJECT_PATH}),
        ("input_map", "list", {"action": "list", "project_path": PROJECT_PATH}),
        ("input_map", "add_action", {"action": "add_action", "action_name": "jump", "deadzone": 0.5, "project_path": PROJECT_PATH}),
        ("input_map", "add_event", {"action": "add_event", "action_name": "jump", "event_type": "key", "event_value": "KEY_SPACE", "project_path": PROJECT_PATH}),
        ("input_map", "remove_action", {"action": "remove_action", "action_name": "jump", "project_path": PROJECT_PATH}),
        ("signals", "list", {"action": "list", "scene_path": "scenes/main.tscn", "project_path": PROJECT_PATH}),
        ("animation", "create_player", {"action": "create_player", "scene_path": "scenes/main.tscn", "name": "Anim", "parent": ".", "project_path": PROJECT_PATH}),
        ("animation", "list", {"action": "list", "scene_path": "scenes/main.tscn", "project_path": PROJECT_PATH}),
        ("tilemap", "create_tileset", {"action": "create_tileset", "tileset_path": "tilesets/basic.tres", "tile_size": 16, "project_path": PROJECT_PATH}),
        ("shader", "create", {"action": "create", "shader_path": "shaders/wave.gdshader", "shader_type": "canvas_item", "project_path": PROJECT_PATH}),
        ("shader", "read", {"action": "read", "shader_path": "shaders/wave.gdshader", "project_path": PROJECT_PATH}),
        ("shader", "list", {"action": "list", "project_path": PROJECT_PATH}),
        ("physics", "layers", {"action": "layers", "project_path": PROJECT_PATH}),
        ("physics", "set_layer_name", {"action": "set_layer_name", "dimension": "2d", "layer_number": 1, "name": "world", "project_path": PROJECT_PATH}),
        ("audio", "list_buses", {"action": "list_buses", "project_path": PROJECT_PATH}),
        ("audio", "add_bus", {"action": "add_bus", "bus_name": "Music", "send_to": "Master", "project_path": PROJECT_PATH}),
        ("navigation", "create_region", {"action": "create_region", "scene_path": "scenes/main.tscn", "name": "NavRegion", "parent": ".", "dimension": "2D", "project_path": PROJECT_PATH}),
        ("ui", "create_control", {"action": "create_control", "scene_path": "scenes/main.tscn", "name": "HUD", "type": "Control", "parent": ".", "project_path": PROJECT_PATH}),
        ("ui", "list_controls", {"action": "list_controls", "scene_path": "scenes/main.tscn", "project_path": PROJECT_PATH}),
        # final cleanup
        ("scenes", "delete_dup", {"action": "delete", "scene_path": "scenes/main_dup.tscn", "project_path": PROJECT_PATH}),
    ]

    results: list[dict[str, Any]] = []

    async with streamablehttp_client(url) as (read_stream, write_stream, _get_session_id):
        async with ClientSession(read_stream, write_stream) as session:
            init_res = await session.initialize()
            print(f"# initialized: server={getattr(init_res.serverInfo,'name',None)} version={getattr(init_res.serverInfo,'version',None)}")
            tools_res = await session.list_tools()
            tool_names = sorted(t.name for t in tools_res.tools)
            print(f"# tools ({len(tool_names)}): {', '.join(tool_names)}")

            for tool, label, args in scenarios:
                ok, summary = await call_tool(session, tool, args)
                status = "PASS" if ok else "FAIL"
                print(f"[{status}] {tool}.{label}: {summary}")
                results.append({"tool": tool, "label": label, "ok": ok, "summary": summary})

    passed = sum(1 for r in results if r["ok"])
    total = len(results)
    print(f"\n# summary: {passed}/{total} scenarios passed")

    out_path = os.path.join(os.path.dirname(__file__), "e2e_mcp_http_report.json")
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump({
            "base_url": BASE_URL,
            "project_path": PROJECT_PATH,
            "tool_names": tool_names,
            "results": results,
            "summary": {"passed": passed, "total": total},
        }, fh, indent=2)
    print(f"# report: {out_path}")

    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
