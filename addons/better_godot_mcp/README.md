# Better Godot MCP EditorPlugin

This Godot 4 EditorPlugin adds a small dock that calls a local Better Godot MCP server over
Streamable HTTP. It is a companion for the server package; it does not replace the server.

## Install locally

Copy this directory into a Godot project as:

```text
res://addons/better_godot_mcp/
```

Enable **Better Godot MCP** from **Project > Project Settings > Plugins**.

The package is verified against Godot 4.7.1. The server repository supports Godot 4.x with a
detector minimum of 4.1; the EditorPlugin verification uses Godot 4.7.1 stable.

## Start the local server

Start the server separately from the Godot Editor. No package installation, process launch, or
network download is performed by the addon.

```sh
npx @n24q02m/better-godot-mcp@latest --http
```

For a deterministic local port, use:

```sh
MCP_TRANSPORT=http PORT=3000 HOST=127.0.0.1 npx @n24q02m/better-godot-mcp@latest --http
```

The dock defaults to `http://127.0.0.1:3000/mcp`. Update the endpoint if the server is using a
different local port or path. The current HTTP mode has **no auth** and is intended for trusted
local or self-hosted use only.

## Use the dock

1. Enter the MCP endpoint and confirm it is a loopback `http://` URL.
2. Confirm the project path, which is prefilled from the current project.
3. Select **Connect**.
4. Select **Project info** or **List scenes** to issue a real MCP `tools/call` request.

Initialization stores the `Mcp-Session-Id` returned by the server. JSON and
`text/event-stream` responses are decoded; HTTP, MCP, timeout, and malformed-response errors are
shown in the dock instead of being reported as successful actions.

## Security boundary

The first package is deliberately local-only. It rejects remote hosts, does not store secrets,
does not spawn a process, and does not download dependencies. A remote/authenticated transport
requires a separate security design.

## Godot Asset Library

The addon package is structured for an official Godot Asset Library review: it includes
`plugin.cfg`, an `@tool` `EditorPlugin`, README, and icon. Submission and listing are separate
public publication steps and are not performed automatically by this repository.
