<script lang="ts">
  import { onMount } from "svelte";
  import { System } from "./system";
  import { initGraph } from "./shader";

  let canvas: HTMLCanvasElement;
  let container: HTMLElement;
  let gl: WebGL2RenderingContext;
  let system: System;

  onMount(async () => {
    resize();
    gl = canvas.getContext("webgl2")!;
    if (!gl || !canvas) return;

    system = new System(canvas);

    // default to monaco
    let sdr = await initGraph(gl, 2220322);

    const updateShaders = async () => {
      sdr = await initGraph(gl, System.getQuery().osm_id);
    };

    const animate = () => {
      if (!gl || !canvas || !sdr) return;
      requestAnimationFrame(animate);

      if (System.hasChangedQuery()) {
        updateShaders();
      }

      handleMouse();
      gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);

      gl.useProgram(sdr.edge.program);

      gl.uniform2f(sdr.edge.uniforms.resolution, canvas.width, canvas.height);

      gl.uniform1f(sdr.edge.uniforms.scale, System.getScale());
      gl.uniform2fv(sdr.edge.uniforms.translation, System.getOffset());
      gl.uniform2fv(sdr.edge.uniforms.mouse, System.getMousePos());

      gl.bindVertexArray(sdr.edge.vao);
      gl.drawArrays(gl.LINES, 0, sdr.edge.positions.length / 2);

      gl.useProgram(sdr.node.program);

      gl.uniform2f(sdr.node.uniforms.resolution, canvas.width, canvas.height);
      gl.uniform2fv(sdr.node.uniforms.translation, System.getOffset());
      gl.uniform1f(sdr.node.uniforms.radius, sdr.node.radius);
      gl.uniform1f(sdr.node.uniforms.scale, System.getScale());
      gl.uniform2fv(sdr.node.uniforms.mouse, System.getMousePos());

      gl.bindVertexArray(sdr.node.vao);
      gl.drawArraysInstanced(
        gl.TRIANGLE_STRIP,
        0,
        sdr.node.positions.length / 2,
        sdr.node.transform.length / 2,
      );
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
    if (System.isMouseButtonPressed(0)) {
      System.setMouseButtons(false, 0);
    }

    if (System.isMouseButtonPressed(1)) {
      let [mx, my] = System.getMousePos();
      const [ix, iy] = System.getMouseInitPos();
      const scale = System.getScale();
      System.setOffset((mx - ix) / scale, (my - iy) / scale, "inc");
      System.initMousePos(mx, my);
    }
  };

  const handleMouseDown = (e: MouseEvent) => {
    switch (e.button) {
      case 0:
        System.setMouseButtons(true, 0);
        break;
      case 2:
        System.setMouseButtons(true, 1);
        System.initMousePos(e.clientX, e.clientY);
        break;
    }
  };

  const handleMouseUp = (e: MouseEvent) => {
    switch (e.button) {
      case 0:
        System.setMouseButtons(false, 0);
        break;
      case 2:
        System.setMouseButtons(false, 1);
        break;
    }
  };

  const removeOffset = (x: number, y: number) => {
    const offset = System.getOffset();
    return {
      x: x / System.getScale() + offset[0],
      y: y / System.getScale() + offset[1],
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    System.setMousePos(e.clientX, e.clientY);
  };

  const handleMouseLeave = () => {
    System.setMouseButtons(false);
  };

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const prezoom = removeOffset(...System.getMousePos());

    if (e.deltaY > 0) {
      System.scaleUp();
    } else {
      System.scaleDown();
    }

    // center zoom around cursor
    const aftzoom = removeOffset(...System.getMousePos());
    System.setOffset(prezoom.x - aftzoom.x, prezoom.y - aftzoom.y, "dec");
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
