export const load = async ({ fetch }: { fetch: typeof window.fetch }) => {
  const aus = [-25.38653, 130.99883, -25.31478, 131.08938];
  const can = [43.636, -79.3963, 43.6545, -79.3722];
  const vie = [17.9605, 102.6009, 17.9722, 102.6135];
  const vie2 = [17.9437, 102.5896, 17.9911, 102.6403];
  const chi = [41.8393, -87.6917, 41.9211, -87.5775];
  const par = [48.7969, 2.2419, 48.9164, 2.4434];
  const rome = [41.7749, 12.3301, 42.007, 12.6518];
  const york = [40.6442, -74.1591, 40.9706, -73.7306];
  const bkok = [13.7057, 100.4528, 13.8014, 100.5629];

  //min lat, min long, max lat, max long

  const bbox = vie;
  const bstring = `${bbox[0]}, ${bbox[1]}, ${bbox[2]}, ${bbox[3]}`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body:
      "data=" +
      encodeURIComponent(`
        [bbox:${bstring}]
        [out:json]; 
        (way[highway ~ "(motorway|trunk|primary|secondary|tertiary|road|residential|.*_link)"];);
        (._;>;); 
        out geom;
        `),
  }).then((data) => data.json());

  return {
    osm: res,
    bbox: {
      minlat: bbox[0],
      minlon: bbox[1],
      maxlat: bbox[2],
      maxlon: bbox[3],
    },
  };
};
