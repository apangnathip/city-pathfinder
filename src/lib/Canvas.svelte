<script lang="ts">
  import { onMount } from "svelte";
  import type { Bounds, OsmObject } from "./osm";
  import { Graph, System } from "./graph";
  export let osm: OsmObject;
  export let bbox: Bounds;
  import { initProgram } from "./shader";

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

  onMount(async () => {
    resize();
    gl = canvas.getContext("webgl2")!;
    if (!gl || !canvas) return;

    system = new System(bbox, canvas.height, initialMapScaling);
    const graph = new Graph(osm.elements, system);

    const edge = graph.getEdgePositions();
    const edgePositions = edge.positions;
    const edgeColors = edge.colors;

    const node = graph.getNodePositions();
    const nodePositions = node.positions;
    const nodeIndices = node.indices;
    const nodeColors = node.colors;

    const program1 = await initProgram(gl, "vs.glsl", "fs.glsl");
    const program2 = await initProgram(gl, "nodeVS.glsl", "nodeFS.glsl");
    if (!program1 || !program2) return;

    gl.useProgram(program1);

    const uniform1 = {
      resolution: gl.getUniformLocation(program1, "u_resolution"),
      translation: gl.getUniformLocation(program1, "u_translation"),
      scale: gl.getUniformLocation(program1, "u_scale"),
      mouse: gl.getUniformLocation(program1, "u_mouse"),
    };

    const positionLoc = gl.getAttribLocation(program1, "a_position");
    const colorLoc = gl.getAttribLocation(program1, "color");

    const edgePositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, edgePositionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(edgePositions),
      gl.STATIC_DRAW,
    );

    const edgeColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, edgeColorBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(edgeColors),
      gl.STATIC_DRAW,
    );

    // Edge VAO
    const edgeVAO = gl.createVertexArray();
    gl.bindVertexArray(edgeVAO);

    gl.bindBuffer(gl.ARRAY_BUFFER, edgePositionBuffer);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    gl.bindBuffer(gl.ARRAY_BUFFER, edgeColorBuffer);
    gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(colorLoc);

    gl.bindVertexArray(null);

    gl.useProgram(program2);

    const nodePositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nodePositionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(nodePositions),
      gl.STATIC_DRAW,
    );

    const nodeIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, nodeIndexBuffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint32Array(nodeIndices),
      gl.STATIC_DRAW,
    );

    const nodeColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nodeColorBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(nodeColors),
      gl.STATIC_DRAW,
    );

    const uniform2 = {
      resolution: gl.getUniformLocation(program2, "u_resolution"),
      translation: gl.getUniformLocation(program2, "u_translation"),
      scale: gl.getUniformLocation(program2, "u_scale"),
      mouse: gl.getUniformLocation(program2, "u_mouse"),
    };

    // Node VAO
    const nodeVAO = gl.createVertexArray();
    gl.bindVertexArray(nodeVAO);

    gl.bindBuffer(gl.ARRAY_BUFFER, nodePositionBuffer);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, nodeIndexBuffer);

    gl.bindBuffer(gl.ARRAY_BUFFER, nodeColorBuffer);
    gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(colorLoc);

    gl.bindVertexArray(null);

    const animate = () => {
      if (!gl || !canvas) return;
      requestAnimationFrame(animate);

      handleMouse(system);
      gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);

      gl.useProgram(program1);

      gl.uniform2f(uniform1.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniform1.scale, mouse.scrollScale);
      gl.uniform2f(uniform1.translation, system.offset.x, system.offset.y);
      gl.uniform2f(uniform1.mouse, mouse.x, mouse.y);

      gl.bindVertexArray(edgeVAO);
      gl.drawArrays(gl.LINES, 0, edgePositions.length / 2);

      gl.useProgram(program2);

      gl.uniform2f(uniform2.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniform2.scale, mouse.scrollScale);
      gl.uniform2f(uniform2.translation, system.offset.x, system.offset.y);
      gl.uniform2f(uniform2.mouse, mouse.x, mouse.y);

      gl.bindVertexArray(nodeVAO);
      gl.drawElements(gl.TRIANGLES, nodeIndices.length, gl.UNSIGNED_INT, 0);
    };

    animate();
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

    if (mouse.isRightHeld) {
      system.offset.x += (mouse.x - mouse.initx) / mouse.scrollScale;
      system.offset.y += (mouse.y - mouse.inity) / mouse.scrollScale;
      mouse.initx = mouse.x;
      mouse.inity = mouse.y;
    }
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

  const removeOffset = (x: number, y: number) => {
    return {
      x: x / mouse.scrollScale + system.offset.x,
      y: y / mouse.scrollScale + system.offset.y,
    };
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
    const prezoom = removeOffset(mouse.x, mouse.y);

    if (e.deltaY > 0) {
      mouse.scrollScale *= 0.8;
    } else {
      mouse.scrollScale *= 1.25;
    }

    // center zoom around cursor
    const aftzoom = removeOffset(mouse.x, mouse.y);
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
    background-color: #191724;
  }
</style>
