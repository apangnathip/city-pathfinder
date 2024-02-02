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

  let scale = 1;
  let offset = {
    x: 0,
    y: 0,
  };

  const mouse = {
    isLeftClicked: false,
    isRightHeld: false,
    initx: 0,
    inity: 0,
    x: 0,
    y: 0,
  };

  onMount(async () => {
    resize();
    ctx = canvas.getContext("2d");
    if (!ctx || !canvas) return;

    offset.x = -canvas.width / 2 + initialMapScaling / 2;
    offset.y = -canvas.height / 2 + initialMapScaling / 1.5;

    const system = new System(bbox, canvas.height, initialMapScaling);
    const graph = new Graph(osm.elements, system);

    const animate = () => {
      if (!ctx || !canvas) return;
      requestAnimationFrame(animate);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      graph.drawEdges(ctx);
      graph.drawNodes(ctx);
      handleMouse(system);
    };

    // graph.drawNodes(ctx);
    // graph.drawEdges(ctx);
    animate();
  });

  const resize = () => {
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    canvas.style.width = container.offsetWidth + "px";
    canvas.style.height = container.offsetHeight + "px";
  };

  const convertToScreenSpace = (x: number, y: number) => {
    return [(x - offset.x) * scale, (y - offset.y) * scale];
  };

  const convertToWorldSpace = (coord: { x: number; y: number }) => {
    return [coord.x / scale + offset.x, coord.y / scale + offset.y];
  };

  const handleMouse = (system: System) => {
    if (mouse.isLeftClicked) {
      mouse.isLeftClicked = false;
    }

    // if (mouse.isRightClicked) {
    //   offset.x -= (mouse.x - mouse.initx) / scale;
    //   offset.y -= (mouse.y - mouse.inity) / scale;
    //   mouse.initx = mouse.x;
    //   mouse.inity = mouse.y;
    // }

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
    const [beforeZoomX, beforeZoomY] = convertToWorldSpace({
      x: mouse.x,
      y: mouse.y,
    });

    if (e.deltaY > 0) {
      scale *= 0.9;
    } else {
      scale *= 1.1;
    }

    const [afterZoomX, afterZoomY] = convertToWorldSpace({
      x: mouse.x,
      y: mouse.y,
    });
    offset.x += beforeZoomX - afterZoomX;
    offset.y += beforeZoomY - afterZoomY;
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
