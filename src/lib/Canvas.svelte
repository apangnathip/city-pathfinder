<script lang="ts">
  import { onMount } from "svelte";
  import type { Bounds, OsmObject } from "./osm";
  import { Graph, System } from "./graph";
  export let osm: OsmObject;
  export let bbox: Bounds;

  let initialMapScaling = 800;

  let canvas: HTMLCanvasElement;
  let container: HTMLElement;
  let ctx: CanvasRenderingContext2D | null;
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
    ctx = canvas.getContext("2d");
    if (!ctx || !canvas) return;

    system = new System(bbox, canvas.height, initialMapScaling);
    const graph = new Graph(osm.elements, system);

    const animate = () => {
      if (!ctx || !canvas) return;
      requestAnimationFrame(animate);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      graph.drawEdges(ctx);
      graph.drawNodes(ctx, true);
      handleMouse(system);
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
