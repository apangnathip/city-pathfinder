const vertexShaderSource = `#version 300 es
  in vec2 a_position;
  
  uniform vec2 u_resolution;
  uniform vec2 u_translation;
  uniform float u_scale;
  
  void main() {
    vec2 position = (a_position + u_translation) * u_scale;
    vec2 clipSpace = (position / u_resolution) * 2.0 - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
  }
`;

const fragmentShaderSource = `#version 300 es
  precision highp float;

  uniform vec4 u_color;

  out vec4 outColor;

  void main() {
    outColor = u_color;
  }
`;

export function initProgram(gl: WebGL2RenderingContext) {
  const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  if (!vs || !fs) return null;

  const program = createProgram(gl, vs, fs);
  if (!program) return null;

  return program;
}

export function createShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
) {
  const shader = gl.createShader(type);
  if (!shader) return;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

  if (success) {
    return shader;
  }

  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

export function createProgram(
  gl: WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
) {
  const program = gl.createProgram();
  if (!program) return;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);

  if (success) {
    return program;
  }

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}
