#version 300 es

in vec2 a_position;
in vec2 transform;
in vec3 color;

out vec3 v_color;
out float v_dist;
out vec2 v_position;
out vec2 v_texcoord;

uniform vec2 u_resolution;
uniform vec2 u_translation;
uniform float u_scale;
uniform vec2 u_mouse;
uniform float u_radius;

void main() {
  vec2 position = (a_position + transform + u_translation) * u_scale;
  vec2 clipSpace = (position / u_resolution) * 2.0 - 1.0;

  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

  v_dist = distance(u_mouse, (transform + u_translation) * u_scale);
  v_position = a_position / (u_radius * 2.0);

  if (u_scale > 1.0) v_position *= u_scale;

  if (v_dist <= u_radius ) {
    v_color = vec3(0.9, 0.0, 0.0); 
  } else {
    v_color = vec3(0.9, 0.9, 0.9);
  }
}
