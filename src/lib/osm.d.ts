type Element = NodeElement | WayElement;

export type NominatimQuery = {
  place_id: number;
  name: string;
  display_name: string;
  osm_id: number;
  osm_type: string;
  boundingbox: string[];
};

export type CartesianCoords = { x: number; y: number };

export type Coords = { lat: number; lon: number };

export type Bounds = {
  maxlat: number;
  maxlon: number;
  minlat: number;
  minlon: number;
};

export type OsmObject = {
  elements: Element[];
};

export type NodeElement = {
  type: "node";
  id: number;
  lat: number;
  lon: number;
};

export type WayElement = {
  type: "way";
  id: number;
  nodes: number[];
  geometry: Coord[];
  bounds: Bounds;
};

type Tag = {
  [key: string]: string;
};
