async function fetchShader(shaderPath: string) {
  let source = "";

  await fetch(shaderPath).then(async (res) => {
    if (res) {
      source = await res.text();
    }
  });

  return source;
}

export async function createShader(
  gl: WebGL2RenderingContext,
  type: number,
  path: string,
) {
  const source = await fetchShader(path);
  if (!source) return null;

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

export async function initProgram(
  gl: WebGL2RenderingContext,
  vertexPath: string,
  fragmentPath: string,
) {
  const vs = await createShader(gl, gl.VERTEX_SHADER, vertexPath);
  const fs = await createShader(gl, gl.FRAGMENT_SHADER, fragmentPath);
  if (!vs || !fs) return null;

  const program = createProgram(gl, vs, fs);
  if (!program) return null;

  return program;
}
