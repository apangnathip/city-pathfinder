#version 300 es

precision highp float;

in vec2 v_position;
in vec3 v_color;
in float v_dist;

out vec4 outColor;

float circle(in float radius){
  vec2 dist = v_position;
  return 1.0 - smoothstep(radius - (radius * 0.01),
                          radius + (radius * 0.01), 
                          dot(dist, dist) * 4.0);
}

void main() {
  if (circle(1.0) < 0.5 || v_dist > 200.0) discard;
  outColor = vec4(v_color, 1.0);
}
