#version 300 es

precision highp float;

in vec3 v_color;
in float v_dist;

out vec4 outColor;

void main() {
  outColor = vec4(v_color, 1);

  if (v_dist > 150.0) {
    discard;
  }
}
