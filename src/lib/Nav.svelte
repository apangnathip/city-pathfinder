<script lang="ts">
  import "@fortawesome/fontawesome-free/css/all.min.css";
  import { System } from "./system";
  import type { NominatimQuery } from "./osm";

  let queries = [] as NominatimQuery[];

  let showQuery = true;

  const nominatimQuery = async (queryString: string) => {
    const queries = await fetch(
      `https://nominatim.openstreetmap.org/search?city=${queryString}&format=json`,
    ).then((res) => res.json());

    return queries.filter(
      (query: NominatimQuery) => query.osm_type === "relation",
    );
  };

  const submitQuery = async (e: SubmitEvent) => {
    e.preventDefault();
    const input = document.getElementById("query-input") as HTMLInputElement;
    queries = await nominatimQuery(input.value);
  };

  const chooseQuery = (query: NominatimQuery) => {
    System.setQuery(query);
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
      {#if queries.length > 0}
        <div id="query-result-box">
          {#each queries as query}
            <div class="query-result" on:click={() => chooseQuery(query)}>
              {query.display_name}
            </div>
          {/each}
        </div>
      {/if}
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
    align-items: center;
  }

  .query-result {
    background-color: white;
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
    width: 20rem;
    font-size: 1rem;
    border-radius: 5px;
  }

  #query-result-box {
    position: absolute;
    background-color: white;
    width: 20rem;
    top: 2.5rem;
    padding: 1rem 0rem;
    border-radius: 5px;
    display: flex;
    flex-direction: column;
  }
</style>
