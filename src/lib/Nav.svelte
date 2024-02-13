<script lang="ts">
  import "@fortawesome/fontawesome-free/css/all.min.css";
  import { System } from "./graph";

  type NominatimQuery = {
    place_id: number;
    name: string;
    display_name: string;
    osm_id: number;
    boundingbox: string[];
  };

  let queries = [] as NominatimQuery[];

  let showQuery = true;

  const nominatimQuery = async (queryString: string) => {
    return await fetch(
      `https://nominatim.openstreetmap.org/search?city=${queryString}&format=json`,
    ).then((res) => res.json());
  };

  const submitQuery = async (e: SubmitEvent) => {
    e.preventDefault();
    const input = document.getElementById("query-input") as HTMLInputElement;
    queries = await nominatimQuery(input.value);
    console.log(queries);
    // System.setQuery("area", input.value);
  };

  const chooseQuery = (query: NominatimQuery) => {
    console.log(query);
    queries = [];
  };
</script>

<main>
  <i
    id="query-toggle"
    class="fa-regular fa-compass"
    on:click={() => (showQuery = !showQuery)}
  />
  {#if showQuery}
    <div id="query-box">
      <form on:submit={submitQuery}>
        <input id="query-input" />
        <input type="submit" hidden />
      </form>
      <div id="query-result-box">
        {#each queries as query}
          <div class="query-result" on:click={() => chooseQuery(query)}>
            {query.display_name}
          </div>
        {/each}
      </div>
    </div>
  {/if}
  <span id="progress"></span>
</main>

<style>
  main {
    margin: 1rem;
    height: 2rem;
    gap: 1rem;
    position: absolute;
    display: flex;
    color: white;
  }

  .query-result {
    background-color: white;
    border-bottom: 1px solid #191724;
    color: black;
    padding: 0.75rem 1rem;
  }

  .query-result:hover {
    background-color: #eeeeee;
  }

  .query-result:active {
    background-color: #dddddd;
  }

  #query-toggle {
    font-size: 2rem;
  }

  #query-toggle:hover {
    color: #aaaaaa;
  }

  #query-toggle:active {
    color: #888888;
  }

  #query-box {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  #query-input {
    padding: 0.5rem 1rem;
    border: none;
    width: 100%;
    font-size: 1rem;
  }

  #query-result-box {
    background-color: white;
    display: flex;
    flex-direction: column;
  }
</style>
