<script lang="ts">
  import { onMount } from "svelte";
  import type { OsmObject } from "./osm";
  import { Graph, System } from "./graph";
  export let osm: OsmObject;
  import { initProgram } from "./shader";

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

  const offset = { x: 0, y: 0 };

  onMount(async () => {
    resize();
    gl = canvas.getContext("webgl2")!;
    if (!gl || !canvas) return;

    system = new System(canvas);
    offset.x = canvas.width / 4;

    const graph = new Graph(osm.elements);
    const edge = graph.getEdgePositions();
    const edgePositions = edge.positions;
    const edgeColors = edge.colors;

    const nodeRadius = 10;
    const nodePositions = [
      -nodeRadius,
      -nodeRadius,
      nodeRadius,
      -nodeRadius,
      -nodeRadius,
      nodeRadius,
      nodeRadius,
      nodeRadius,
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
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(edgeColors),
      gl.STATIC_DRAW,
    );

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

    const animate = () => {
      if (!gl || !canvas) return;
      requestAnimationFrame(animate);

      handleMouse();
      gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);

      gl.useProgram(edgeProgram);

      gl.uniform2f(edgeUniform.resolution, canvas.width, canvas.height);
      gl.uniform1f(edgeUniform.scale, mouse.scrollScale);
      gl.uniform2f(edgeUniform.translation, offset.x, offset.y);
      gl.uniform2f(edgeUniform.mouse, mouse.x, mouse.y);

      gl.bindVertexArray(edgeVAO);
      gl.drawArrays(gl.LINES, 0, edgePositions.length / 2);

      // gl.useProgram(nodeProgram);
      //
      // gl.uniform2f(nodeUniform.resolution, canvas.width, canvas.height);
      // gl.uniform2f(nodeUniform.translation, offset.x, offset.y);
      // gl.uniform1f(nodeUniform.radius, nodeRadius);
      // gl.uniform1f(nodeUniform.scale, mouse.scrollScale);
      // gl.uniform2f(nodeUniform.mouse, mouse.x, mouse.y);
      //
      // gl.bindVertexArray(nodeVAO);
      // gl.drawArraysInstanced(
      //   gl.TRIANGLE_STRIP,
      //   0,
      //   nodePositions.length / 2,
      //   nodeTransform.length / 2,
      // );
    };

    animate();
  });

  const resize = () => {
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    canvas.style.width = container.offsetWidth + "px";
    canvas.style.height = container.offsetHeight + "px";
  };

  const handleMouse = () => {
    if (mouse.isLeftClicked) {
      mouse.isLeftClicked = false;
    }

    if (mouse.isRightHeld) {
      offset.x += (mouse.x - mouse.initx) / mouse.scrollScale;
      offset.y += (mouse.y - mouse.inity) / mouse.scrollScale;
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
      x: x / mouse.scrollScale + offset.x,
      y: y / mouse.scrollScale + offset.y,
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
    offset.x -= prezoom.x - aftzoom.x;
    offset.y -= prezoom.y - aftzoom.y;
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
