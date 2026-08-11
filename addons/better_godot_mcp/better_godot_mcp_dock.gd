@tool
extends VBoxContainer

const DEFAULT_ENDPOINT := "http://127.0.0.1:3000/mcp"
const MCP_PROTOCOL_VERSION := "2025-11-25"
const CLIENT_NAME := "better-godot-mcp-editor"
const CLIENT_VERSION := "0.1.0"
const REQUEST_TIMEOUT_SECONDS := 10.0

var endpoint_edit: LineEdit
var project_path_edit: LineEdit
var connect_button: Button
var project_info_button: Button
var list_scenes_button: Button
var status_label: Label
var result_view: TextEdit

var request_id := 0
var session_id := ""
var connected := false
var busy := false

func _ready() -> void:
	_build_ui()

func _build_ui() -> void:
	name = "Better Godot MCP"
	size_flags_horizontal = Control.SIZE_EXPAND_FILL

	var title := Label.new()
	title.text = "Better Godot MCP"
	title.add_theme_font_size_override("font_size", 16)
	add_child(title)

	var description := Label.new()
	description.text = "Local MCP actions for the current Godot project."
	description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	add_child(description)

	var endpoint_label := Label.new()
	endpoint_label.text = "MCP endpoint"
	add_child(endpoint_label)

	endpoint_edit = LineEdit.new()
	endpoint_edit.text = DEFAULT_ENDPOINT
	endpoint_edit.placeholder_text = DEFAULT_ENDPOINT
	endpoint_edit.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	add_child(endpoint_edit)

	var project_label := Label.new()
	project_label.text = "Project path"
	add_child(project_label)

	project_path_edit = LineEdit.new()
	project_path_edit.text = ProjectSettings.globalize_path("res://")
	project_path_edit.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	add_child(project_path_edit)

	connect_button = Button.new()
	connect_button.text = "Connect"
	connect_button.pressed.connect(_on_connect_pressed)
	add_child(connect_button)

	var actions := HBoxContainer.new()
	add_child(actions)

	project_info_button = Button.new()
	project_info_button.text = "Project info"
	project_info_button.disabled = true
	project_info_button.pressed.connect(_on_project_info_pressed)
	actions.add_child(project_info_button)

	list_scenes_button = Button.new()
	list_scenes_button.text = "List scenes"
	list_scenes_button.disabled = true
	list_scenes_button.pressed.connect(_on_list_scenes_pressed)
	actions.add_child(list_scenes_button)

	status_label = Label.new()
	status_label.text = "Not connected"
	status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	add_child(status_label)

	result_view = TextEdit.new()
	result_view.editable = false
	result_view.placeholder_text = "MCP results appear here."
	result_view.custom_minimum_size = Vector2(0, 220)
	result_view.size_flags_vertical = Control.SIZE_EXPAND_FILL
	add_child(result_view)

func _on_connect_pressed() -> void:
	if busy:
		return

	busy = true
	connected = false
	session_id = ""
	_refresh_action_buttons()
	_set_status("Connecting...", false)

	var initialize_response: Dictionary = await _mcp_request(
		"initialize",
		{
			"protocolVersion": MCP_PROTOCOL_VERSION,
			"capabilities": {},
			"clientInfo": {"name": CLIENT_NAME, "version": CLIENT_VERSION},
		},
		true,
	)
	if not initialize_response.get("ok", false):
		_finish_request(str(initialize_response.get("error", "Initialize failed.")), true)
		return

	var notification_response: Dictionary = await _mcp_request("notifications/initialized", {}, false)
	if not notification_response.get("ok", false):
		_finish_request(str(notification_response.get("error", "Initialization notification failed.")), true)
		return

	connected = true
	busy = false
	_refresh_action_buttons()
	_set_status("Connected to %s" % endpoint_edit.text.strip_edges(), false)

func _on_project_info_pressed() -> void:
	_call_tool(
		"project",
		{"action": "info", "project_path": project_path_edit.text.strip_edges()},
		"Project info",
	)

func _on_list_scenes_pressed() -> void:
	_call_tool(
		"scenes",
		{"action": "list", "project_path": project_path_edit.text.strip_edges()},
		"Scenes",
	)

func _call_tool(tool_name: String, arguments: Dictionary, label: String) -> void:
	if busy:
		return
	if not connected:
		_set_status("Connect before calling %s." % label, true)
		return

	busy = true
	_refresh_action_buttons()
	_set_status("Calling %s..." % label, false)
	var response: Dictionary = await _mcp_request(
		"tools/call",
		{"name": tool_name, "arguments": arguments},
		true,
	)
	if not response.get("ok", false):
		_finish_request(str(response.get("error", "%s failed." % label)), true)
		return

	busy = false
	_refresh_action_buttons()
	_set_status("%s complete" % label, false)
	result_view.text = _format_tool_result(response.get("payload", {}))

func _mcp_request(method: String, params: Dictionary, expect_response: bool) -> Dictionary:
	var endpoint := endpoint_edit.text.strip_edges()
	if not _is_loopback_endpoint(endpoint):
		return {"ok": false, "error": "Only an http:// loopback endpoint is allowed."}

	var request := HTTPRequest.new()
	request.timeout = REQUEST_TIMEOUT_SECONDS
	add_child(request)

	var headers := PackedStringArray([
		"Content-Type: application/json",
		"Accept: application/json, text/event-stream",
		"MCP-Protocol-Version: %s" % MCP_PROTOCOL_VERSION,
	])
	if not session_id.is_empty():
		headers.append("Mcp-Session-Id: %s" % session_id)

	var message: Dictionary = {"jsonrpc": "2.0", "method": method}
	if expect_response:
		request_id += 1
		message["id"] = request_id
	if not params.is_empty():
		message["params"] = params

	var request_error := request.request(endpoint, headers, HTTPClient.METHOD_POST, JSON.stringify(message))
	if request_error != OK:
		request.queue_free()
		return {"ok": false, "error": "Could not start HTTP request: %s" % error_string(request_error)}

	var completion: Array = await request.request_completed
	var result_code: int = completion[0]
	var response_code: int = completion[1]
	var response_headers: PackedStringArray = completion[2]
	var response_body: PackedByteArray = completion[3]
	var response_session_id := _find_header(response_headers, "mcp-session-id")
	if not response_session_id.is_empty():
		session_id = response_session_id
	request.queue_free()

	if result_code != HTTPRequest.RESULT_SUCCESS:
		return {"ok": false, "error": "HTTP request failed: %s" % _http_result_name(result_code)}
	if response_code < 200 or response_code >= 300:
		return {"ok": false, "error": "HTTP %d from MCP endpoint." % response_code}
	if not expect_response and response_body.is_empty():
		return {"ok": true}
	if response_body.is_empty():
		return {"ok": false, "error": "MCP endpoint returned an empty response."}

	var payload: Variant = _decode_payload(response_body, response_headers)
	if payload == null or not (payload is Dictionary):
		return {"ok": false, "error": "MCP endpoint returned malformed JSON."}
	var payload_dictionary: Dictionary = payload
	if payload_dictionary.has("error"):
		return {"ok": false, "error": "MCP error: %s" % JSON.stringify(payload_dictionary["error"])}
	return {"ok": true, "payload": payload_dictionary}

func _decode_payload(body: PackedByteArray, headers: PackedStringArray) -> Variant:
	var text := body.get_string_from_utf8()
	var content_type := _find_header(headers, "content-type").to_lower()
	if content_type.contains("text/event-stream"):
		var event_payload: Variant = null
		for event in text.split("\n\n"):
			for line in event.split("\n"):
				if not line.begins_with("data:"):
					continue
				var candidate := line.trim_prefix("data:").strip_edges()
				if candidate.is_empty() or candidate == "[DONE]":
					continue
				var parsed: Variant = JSON.parse_string(candidate)
				if parsed != null:
					event_payload = parsed
		return event_payload
	return JSON.parse_string(text)

func _format_tool_result(payload: Dictionary) -> String:
	var result: Variant = payload.get("result", payload)
	if result is Dictionary:
		var content: Variant = result.get("content", [])
		if content is Array:
			for item in content:
				if item is Dictionary and item.has("text"):
					return str(item["text"])
	return JSON.stringify(payload, "\t")

func _is_loopback_endpoint(endpoint: String) -> bool:
	var normalized := endpoint.to_lower()
	if not normalized.begins_with("http://"):
		return false
	var authority := normalized.trim_prefix("http://")
	var slash := authority.find("/")
	if slash >= 0:
		authority = authority.substr(0, slash)
	if authority.is_empty() or authority.contains("@") or authority.contains("\\"):
		return false
	if authority.begins_with("[::1]"):
		return _is_valid_port_suffix(authority.substr(5))
	var colon := authority.find(":")
	if colon >= 0 and authority.find(":", colon + 1) >= 0:
		return false
	if colon >= 0 and not _is_valid_port(authority.substr(colon + 1)):
		return false
	var host := authority if colon < 0 else authority.substr(0, colon)
	return host == "localhost" or host == "127.0.0.1"

func _is_valid_port_suffix(suffix: String) -> bool:
	if suffix.is_empty():
		return true
	return suffix.begins_with(":") and _is_valid_port(suffix.substr(1))

func _is_valid_port(port: String) -> bool:
	if port.is_empty() or port != port.strip_edges() or not port.is_valid_int():
		return false
	var value := port.to_int()
	return value > 0 and value <= 65535

func _find_header(headers: PackedStringArray, name: String) -> String:
	var wanted := name.to_lower()
	for header in headers:
		var separator := header.find(":")
		if separator < 0:
			continue
		if header.substr(0, separator).strip_edges().to_lower() == wanted:
			return header.substr(separator + 1).strip_edges()
	return ""

func _http_result_name(result_code: int) -> String:
	return {
		HTTPRequest.RESULT_CANT_CONNECT: "cannot connect",
		HTTPRequest.RESULT_CANT_RESOLVE: "cannot resolve host",
		HTTPRequest.RESULT_CONNECTION_ERROR: "connection error",
		HTTPRequest.RESULT_TIMEOUT: "timeout",
	}.get(result_code, "error code %d" % result_code)

func _finish_request(message: String, is_error: bool) -> void:
	busy = false
	connected = false
	_refresh_action_buttons()
	_set_status(message, is_error)

func _refresh_action_buttons() -> void:
	if connect_button == null:
		return
	connect_button.disabled = busy
	project_info_button.disabled = busy or not connected
	list_scenes_button.disabled = busy or not connected

func _set_status(message: String, is_error: bool) -> void:
	status_label.text = message
	status_label.modulate = Color(1.0, 0.45, 0.45) if is_error else Color(0.75, 0.9, 1.0)
