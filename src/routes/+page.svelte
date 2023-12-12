<script lang="ts">
  import Canvas from "$lib/Canvas.svelte";
  export let data;
</script>

<main>
  <Canvas osm={data.osm} bbox={data.bbox}></Canvas>
</main>

<style>
  main {
    height: 100%;
  }
</style>
