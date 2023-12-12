type Element = Node | Way;

export type Coord = {
  lat: number;
  lon: number;
};

export type Bounds = {
  maxlat: number;
  maxlon: number;
  minlat: number;
  minlon: number;
};

export type OsmObject = {
  elements: Element[];
};

export type Node = {
  type: "node";
  id: number;
  lat: number;
  lon: number;
  tags: Tag;
};

export type Way = {
  type: "way";
  id: number;
  nodes: Node[];
  geometry: Coord[];
  bounds: Bounds;
  tags: Tag;
};

type Tag = {
  [key: string]: string;
};
