export async function query(areaID: number) {
  const progress = document.getElementById("progress");
  if (progress) progress.textContent = "Loading...";

  const data = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body:
      "data=" +
      encodeURIComponent(`
        [out:json];
        area(${3600000000 + areaID});
        (way(area)[highway ~ "(motorway|trunk|primary|secondary|tertiary|road|residential|.*_link)"];);
        (._;>;);
        out geom;
        `),
  }).then((data) => data.json());

  if (progress) progress.textContent = "";
  return data;
}
