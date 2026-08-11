extends SceneTree

const SOURCE = "res://../../../../addons/better_godot_mcp/icon.svg"
const DESTINATION = "res://../../../../addons/better_godot_mcp/icon.png"

func _init() -> void:
    var image := Image.new()
    var load_error := image.load_svg_from_buffer(FileAccess.get_file_as_bytes(SOURCE))
    if load_error != OK:
        printerr("Could not load plugin SVG: ", load_error)
        quit(1)
        return

    var save_error := image.save_png(DESTINATION)
    if save_error != OK:
        printerr("Could not save plugin PNG: ", save_error)
        quit(1)
        return

    quit(0)
