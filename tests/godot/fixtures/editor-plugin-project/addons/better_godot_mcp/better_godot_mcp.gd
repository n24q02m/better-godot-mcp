@tool
extends EditorPlugin

const Dock = preload("res://addons/better_godot_mcp/better_godot_mcp_dock.gd")

var dock: Control

func _enter_tree() -> void:
	dock = Dock.new()
	dock.name = "BetterGodotMcpDock"
	add_control_to_dock(DOCK_SLOT_RIGHT_UL, dock)

func _exit_tree() -> void:
	if is_instance_valid(dock):
		remove_control_from_docks(dock)
		dock.queue_free()
		dock = null
