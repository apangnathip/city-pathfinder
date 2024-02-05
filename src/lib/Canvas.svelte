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

    const program = initProgram(gl);
    if (!program) return;

    gl.useProgram(program);

    const uniform = {
      resolution: gl.getUniformLocation(program, "u_resolution"),
      translation: gl.getUniformLocation(program, "u_translation"),
      scale: gl.getUniformLocation(program, "u_scale"),
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

      handleMouse(system);

      gl.uniform2f(uniform.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniform.scale, mouse.scrollScale);
      gl.uniform2fv(uniform.translation, [system.offset.x, system.offset.y]);
      gl.uniform4f(uniform.color, 0, 0, 0, 1);
      gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);

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
      if (mouse.scrollScale > 0.1) {
        mouse.scrollScale *= 0.8;
      }
    } else {
      if (mouse.scrollScale < 10) {
        mouse.scrollScale *= 1.25;
      }
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
    background-color: gray;
  }
</style>
