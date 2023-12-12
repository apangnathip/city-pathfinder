<script lang="ts">
  import { onMount } from "svelte";
  import type { Bounds, Coord, Element, OsmObject, Way } from "./osm";
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
    isRightClicked: false,
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

    const animate = () => {
      if (!ctx || !canvas) return;
      requestAnimationFrame(animate);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      handleMouse();
      parseElements(osm.elements);
    };

    animate();
  });

  const resize = () => {
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    canvas.style.width = container.offsetWidth + "px";
    canvas.style.height = container.offsetHeight + "px";
  };

  const normalizeNumber = (
    number: number,
    range: { min: number; max: number },
  ) => {
    return ((number - range.min) / (range.max - range.min)) * initialMapScaling;
  };

  const normalizeCoord = (coord: Coord) => {
    const latRange = { min: bbox.minlat, max: bbox.maxlat };
    const lonRange = { min: bbox.minlon, max: bbox.maxlon };
    return {
      lat: canvas.height - normalizeNumber(coord.lat, latRange),
      lon: normalizeNumber(coord.lon, lonRange),
    };
  };

  const convertToScreenSpace = (coord: Coord) => {
    return {
      x: (coord.lon - offset.x) * scale,
      y: (coord.lat - offset.y) * scale,
    };
  };

  const convertToWorldSpace = (coord: { x: number; y: number }) => {
    return {
      lon: coord.x / scale + offset.x,
      lat: coord.y / scale + offset.y,
    };
  };

  const parseElements = (elements: Element[]) => {
    if (!ctx) return;
    ctx.beginPath();

    for (const element of elements) {
      if (element.type === "way") {
        drawWay(element);
      }
    }

    ctx.stroke();
  };

  const drawWay = (way: Way) => {
    if (!ctx) return;
    let begin = true;

    for (const point of way.geometry) {
      const coords = convertToScreenSpace(normalizeCoord(point));

      if (begin) {
        ctx.moveTo(coords.x, coords.y);
        begin = false;
      } else {
        ctx.lineTo(coords.x, coords.y);
      }
    }
  };

  const handleMouse = () => {
    if (mouse.isRightClicked) {
      offset.x -= (mouse.x - mouse.initx) / scale;
      offset.y -= (mouse.y - mouse.inity) / scale;
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
        mouse.isRightClicked = true;
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
        mouse.isRightClicked = false;
        break;
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  };

  const handleMouseLeave = () => {
    mouse.isLeftClicked = false;
    mouse.isRightClicked = false;
  };

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const mouseBeforeZoom = convertToWorldSpace({ x: mouse.x, y: mouse.y });

    if (e.deltaY > 0) {
      scale *= 0.9;
    } else {
      scale *= 1.1;
    }

    const mouseAfterZoom = convertToWorldSpace({ x: mouse.x, y: mouse.y });
    offset.x += mouseBeforeZoom.lon - mouseAfterZoom.lon;
    offset.y += mouseBeforeZoom.lat - mouseAfterZoom.lat;
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
