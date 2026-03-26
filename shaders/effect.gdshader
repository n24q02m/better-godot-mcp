shader_type canvas_item;

uniform vec4 tint_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform float intensity = 0.5;
uniform sampler2D noise_tex : hint_default_white;

void fragment() {
	COLOR = texture(TEXTURE, UV) * tint_color * intensity;
}
