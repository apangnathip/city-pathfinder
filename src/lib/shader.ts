import { Graph } from "./graph";
import { query } from "./query";
import { System } from "./system";

export async function initGraph(gl: WebGL2RenderingContext, areaID: number) {
  const osm = await query(areaID);
  const graph = new Graph(osm.elements);
  const edge = graph.getEdgePositions();
  const edgePositions = edge.positions;
  const edgeColors = edge.colors;

  System.resetOffset();
  System.resetScale();

  const nodePositions = [
    -graph.nodeRadius,
    -graph.nodeRadius,
    graph.nodeRadius,
    -graph.nodeRadius,
    -graph.nodeRadius,
    graph.nodeRadius,
    graph.nodeRadius,
    graph.nodeRadius,
  ];
  const nodeTransform = graph.getNodePositions();

  const edgeProgram = await initProgram(gl, "vs.glsl", "fs.glsl");
  const nodeProgram = await initProgram(gl, "nodeVS.glsl", "nodeFS.glsl");
  if (!edgeProgram || !nodeProgram) return;

  gl.useProgram(edgeProgram);

  const edgeUniform = {
    resolution: gl.getUniformLocation(edgeProgram, "u_resolution"),
    translation: gl.getUniformLocation(edgeProgram, "u_translation"),
    scale: gl.getUniformLocation(edgeProgram, "u_scale"),
    mouse: gl.getUniformLocation(edgeProgram, "u_mouse"),
  };

  const positionLoc = gl.getAttribLocation(edgeProgram, "a_position");
  const colorLoc = gl.getAttribLocation(edgeProgram, "color");

  const edgePositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, edgePositionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(edgePositions),
    gl.STATIC_DRAW,
  );

  const edgeColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, edgeColorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(edgeColors), gl.STATIC_DRAW);

  const edgeVAO = gl.createVertexArray();
  gl.bindVertexArray(edgeVAO);

  gl.bindBuffer(gl.ARRAY_BUFFER, edgePositionBuffer);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLoc);

  gl.bindBuffer(gl.ARRAY_BUFFER, edgeColorBuffer);
  gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(colorLoc);

  gl.bindVertexArray(null);

  gl.useProgram(nodeProgram);

  const transformLoc = gl.getAttribLocation(nodeProgram, "transform");

  const nodeUniform = {
    resolution: gl.getUniformLocation(nodeProgram, "u_resolution"),
    translation: gl.getUniformLocation(nodeProgram, "u_translation"),
    radius: gl.getUniformLocation(nodeProgram, "u_radius"),
    scale: gl.getUniformLocation(nodeProgram, "u_scale"),
    mouse: gl.getUniformLocation(nodeProgram, "u_mouse"),
  };

  const nodePositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, nodePositionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(nodePositions),
    gl.STATIC_DRAW,
  );

  const nodeTransformBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, nodeTransformBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(nodeTransform),
    gl.STATIC_DRAW,
  );

  const nodeVAO = gl.createVertexArray();
  gl.bindVertexArray(nodeVAO);

  gl.bindBuffer(gl.ARRAY_BUFFER, nodePositionBuffer);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLoc);

  gl.bindBuffer(gl.ARRAY_BUFFER, nodeTransformBuffer);
  gl.vertexAttribPointer(transformLoc, 2, gl.FLOAT, false, 0, 0);
  gl.vertexAttribDivisor(transformLoc, 1);
  gl.enableVertexAttribArray(transformLoc);

  gl.bindVertexArray(null);

  return {
    edge: {
      program: edgeProgram,
      vao: edgeVAO,
      uniforms: edgeUniform,
      positions: edgePositions,
    },
    node: {
      program: nodeProgram,
      vao: nodeVAO,
      uniforms: nodeUniform,
      positions: nodePositions,
      transform: nodeTransform,
      radius: graph.nodeRadius,
    },
  };
}

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
