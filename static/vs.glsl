#version 300 es

in vec2 a_position;
in vec3 color;

out vec3 v_color;

uniform vec2 u_resolution;
uniform vec2 u_translation;
uniform float u_scale;

void main() {
  vec2 position = (a_position + u_translation) * u_scale;
  vec2 clipSpace = (position / u_resolution) * 2.0 - 1.0;

  gl_PointSize = 15.0;
  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

  v_color = color;
}
