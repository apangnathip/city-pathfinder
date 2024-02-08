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

    let { positions, colors } = graph.getEdgePositions();

    const program = await initProgram(gl, "vs.glsl", "fs.glsl");
    if (!program) return;

    gl.useProgram(program);

    const uniform = {
      resolution: gl.getUniformLocation(program, "u_resolution"),
      translation: gl.getUniformLocation(program, "u_translation"),
      scale: gl.getUniformLocation(program, "u_scale"),
    };

    const positionLoc = gl.getAttribLocation(program, "a_position");
    const colorLoc = gl.getAttribLocation(program, "color");

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(colorLoc);

    const animate = () => {
      if (!gl || !canvas) return;
      requestAnimationFrame(animate);

      handleMouse(system);
      gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);

      gl.uniform2f(uniform.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniform.scale, mouse.scrollScale);
      gl.uniform2fv(uniform.translation, [system.offset.x, system.offset.y]);

      gl.drawArrays(gl.LINES, 0, positions.length / 2);
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
