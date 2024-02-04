<script lang="ts">
  import { onMount } from "svelte";
  import type { Bounds, OsmObject } from "./osm";
  import { Graph, System } from "./graph";
  export let osm: OsmObject;
  export let bbox: Bounds;

  let initialMapScaling = 800;

  let canvas: HTMLCanvasElement;
  let container: HTMLElement;
  let gl: WebGL2RenderingContext;
  let system: System;

  const mouse = {
    x: 0,
    y: 0,
    isLeftClicked: false,
    isRightHeld: false,
    initx: 0,
    inity: 0,
    scrollScale: 1,
  };

  function createShader(
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

  function createProgram(
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

  const vertexShaderSource = `#version 300 es
    in vec2 a_position;
    
    uniform vec2 u_resolution;
    
    void main() {
      vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
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

  onMount(async () => {
    resize();
    gl = canvas.getContext("webgl2")!;
    if (!gl || !canvas) return;

    system = new System(bbox, canvas.height, initialMapScaling);
    const graph = new Graph(osm.elements, system);

    const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vs || !fs) return;

    const program = createProgram(gl, vs, fs);
    if (!program) return;

    gl.useProgram(program);

    //
    // const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    // gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);
    //
    // const colorLocation = gl.getUniformLocation(program, "u_color");
    // gl.uniform4f(colorLocation, 0, 0, 0, 1);
    //
    // gl.drawArrays(gl.LINES, 0, positions.length / 2);

    const uniform = {
      resolution: gl.getUniformLocation(program, "u_resolution"),
      color: gl.getUniformLocation(program, "u_color"),
    };

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    const positionAttribLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionAttribLoc);
    gl.vertexAttribPointer(positionAttribLoc, 2, gl.FLOAT, false, 0, 0);

    const positions = graph.getEdgePositions();
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(positions),
      gl.DYNAMIC_DRAW,
    );

    const animate = () => {
      if (!gl || !canvas) return;
      requestAnimationFrame(animate);

      // graph.drawEdges(gl);
      // graph.drawNodes(gl, true);
      handleMouse(system);

      gl.uniform2f(uniform.resolution, canvas.width, canvas.height);
      gl.uniform4f(uniform.color, 0, 0, 0, 1);
      gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);

      gl.drawArrays(gl.LINES, 0, positions.length / 2);
    };

    animate();
    // graph.drawEdgesGL(gl);
  });

  const resize = () => {
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    canvas.style.width = container.offsetWidth + "px";
    canvas.style.height = container.offsetHeight + "px";
  };

  const handleMouse = (system: System) => {
    if (mouse.isLeftClicked) {
      mouse.isLeftClicked = false;
    }
    system.updateMouse(mouse);
  };

  const handleMouseDown = (e: MouseEvent) => {
    switch (e.button) {
      case 0:
        mouse.isLeftClicked = true;
        break;
      case 2:
        mouse.isRightHeld = true;
        mouse.initx = e.clientX;
        mouse.inity = e.clientY;
        break;
    }
  };

  const handleMouseUp = (e: MouseEvent) => {
    switch (e.button) {
      case 0:
        mouse.isLeftClicked = false;
        break;
      case 2:
        mouse.isRightHeld = false;
        break;
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  };

  const handleMouseLeave = () => {
    mouse.isLeftClicked = false;
    mouse.isRightHeld = false;
  };

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const prezoom = system.removeOffset(mouse.x, mouse.y);

    if (e.deltaY > 0) {
      if (mouse.scrollScale > 0.1) {
        mouse.scrollScale *= 0.8;
      }
    } else {
      if (mouse.scrollScale < 10) {
        mouse.scrollScale *= 1.25;
      }
    }

    // center zoom around cursor
    const aftzoom = system.removeOffset(mouse.x, mouse.y);
    system.offset.x -= prezoom.x - aftzoom.x;
    system.offset.y -= prezoom.y - aftzoom.y;
  };
</script>

<svelte:window on:resize={() => resize()} />

<div id="container" bind:this={container}>
  <canvas
    bind:this={canvas}
    on:contextmenu={(e) => e.preventDefault()}
    on:mousedown={handleMouseDown}
    on:mouseup={handleMouseUp}
    on:mousemove={handleMouseMove}
    on:mouseleave={handleMouseLeave}
    on:wheel={handleWheel}
  ></canvas>
</div>

<style>
  #container {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  canvas {
    background-color: gray;
  }
</style>
