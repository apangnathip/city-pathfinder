import type { Bounds, Element, NodeElement } from "./osm";

type Range = { min: number; max: number };
type Coord = { x: number; y: number };

type Mouse = {
  x: number;
  y: number;
  isLeftClicked: boolean;
  isRightHeld: boolean;
  initx: number;
  inity: number;
  scrollScale: number;
};

export class System {
  private static _instance: System;
  private static _canvas: HTMLCanvasElement;
  private static _bbox: Bounds;

  constructor(canvas: HTMLCanvasElement, bbox: Bounds) {
    if (!System._instance) {
      System._instance = this;
      System._canvas = canvas;
      System._bbox = bbox;
      System._bbox.minlat = System.mercator(bbox.minlat);
      System._bbox.maxlat = System.mercator(bbox.maxlat);
    }
    return System._instance;
  }

  static getInstance() {
    if (System._instance) {
      return System._instance;
    }
    console.error("No system instance has been initialised");
  }

  static getCanvas() {
    return System._canvas;
  }

  static getBounds() {
    return System._bbox;
  }

  static normaliseByRange(n: number, min: number, max: number) {
    return (n - min) / (max - min);
  }

  static mercator(coord: number) {
    return (
      Math.log(Math.tan(Math.PI / 4 + (coord / 2) * (Math.PI / 180))) *
      (180 / Math.PI)
    );
  }
}

export class Graph {
  adjList: Map<number, Map<number, Edge>>;
  nodes: Map<number, Node>;
  pathNodePos: Map<number, Coord>;
  travelled: Map<number, boolean>;
  activeNodes: number[];
  isNodeFound: boolean;

  constructor(elements: Element[]) {
    this.adjList = new Map();
    this.nodes = new Map();
    this.pathNodePos = new Map();
    this.travelled = new Map();
    this.activeNodes = [];
    this.isNodeFound = false;

    const linkCounter = new Map();

    for (const element of elements) {
      if (element.type === "way") {
        for (const nodeID of element.nodes) {
          if (linkCounter.has(nodeID)) {
            linkCounter.set(nodeID, linkCounter.get(nodeID) + 1);
          } else {
            linkCounter.set(nodeID, 1);
          }
        }
      }
    }

    for (const element of elements) {
      if (element.type === "node") {
        if (!this.nodes.has(element.id)) {
          this.nodes.set(element.id, new Node(element, this));
        }

        // disregard nodes not referenced by a way other than its own
        if (linkCounter.get(element.id) > 1) {
          this.addNodeToAdj(element.id);
        }
      }
    }

    for (const element of elements) {
      if (element.type === "way") {
        const endID = element.nodes[element.nodes.length - 1];

        const end = this.nodes.get(endID);
        let path = [];
        let start = this.nodes.get(element.nodes[0]);

        if (!start || !end) continue;

        for (const nodeID of element.nodes.slice(1, -1)) {
          const currentNode = this.nodes.get(nodeID);
          if (!currentNode) continue;

          // split ways at intersection into separate edges
          if (linkCounter.get(nodeID) > 1) {
            const edge = new Edge(start, currentNode, path, this);
            this.addEdge(edge);
            start = currentNode;
            path = [];
          } else {
            path.push(nodeID);
          }
        }

        const endEdge = new Edge(start, end, path, this);
        this.addEdge(endEdge);
      }
    }
  }

  pathFind() {
    const [a, b] = this.activeNodes;
    this.DFS(a, b);
  }

  DFS(curr: number, target: number, travelled = new Map(), path: Edge[] = []) {
    if (curr === target || this.isNodeFound) {
      console.log("FOUND!");
      this.isNodeFound = true;
      return path;
    }

    travelled.set(curr, true);

    const adj = this.adjList.get(curr);
    if (!adj) return;

    for (const [id, edge] of adj) {
      if (travelled.has(id)) continue;
      path.push(edge);
      edge.active = true;
      setTimeout(() => {
        return this.DFS(id, target, travelled, path);
      }, 0);
    }
  }

  addActiveNode(id: number) {
    this.activeNodes.push(id);
    if (this.activeNodes.length > 2) this.activeNodes.shift();
    if (this.activeNodes.length === 2) {
      this.pathFind();
    }
  }

  addNodeToAdj(id: number) {
    this.adjList.set(id, new Map());
  }

  addEdge(edge: Edge) {
    this.adjList.get(edge.nodeA.id)?.set(edge.nodeB.id, edge);
    this.adjList.get(edge.nodeB.id)?.set(edge.nodeA.id, edge);
  }

  getNodePositions() {
    const positions = [];
    const memo = new Map();

    for (const [startID, adj] of this.adjList.entries()) {
      const startNode = this.nodes.get(startID);
      if (!startNode) continue;

      for (const edge of adj.values()) {
        if (!memo.has(edge.nodeA.id)) {
          memo.set(edge.nodeA.id, true);
          positions.push(edge.nodeA.x, edge.nodeA.y);
        }

        if (!memo.has(edge.nodeB.id)) {
          memo.set(edge.nodeB.id, true);
          positions.push(edge.nodeB.x, edge.nodeB.y);
        }
      }
    }

    return positions;
  }

  getEdgePositions() {
    const positions = [];

    for (const [startID, adj] of this.adjList.entries()) {
      const startNode = this.nodes.get(startID);
      if (!startNode) continue;

      for (const edge of adj.values()) {
        positions.push(edge.nodeA.x, edge.nodeA.y);

        for (let i = 0; i < edge.path.length; i++) {
          const pathNode = this.nodes.get(edge.path[i]);
          if (!pathNode) continue;

          positions.push(pathNode.x, pathNode.y);
          positions.push(pathNode.x, pathNode.y);
        }

        positions.push(edge.nodeB.x, edge.nodeB.y);
      }
    }

    // default color of all vertices as white
    const colors = new Array((positions.length / 2) * 3).fill(1);
    return { positions, colors };
  }
}

class Node {
  graph: Graph;
  id: number;
  x: number;
  y: number;
  active: boolean;
  radius: number;
  color: string;
  hoverRadius = 2;

  constructor(nodeElement: NodeElement, graph: Graph) {
    this.graph = graph;
    this.id = nodeElement.id;
    this.radius = 5;
    this.color = "black";
    this.active = false;

    const coords = this.normalizeCoords(nodeElement);
    this.x = coords.x;
    this.y = coords.y;
  }

  normalizeCoords(nodeElement: NodeElement) {
    const canvasHeight = System.getCanvas().height;
    const { minlat, maxlat, minlon, maxlon } = System.getBounds();

    const lon = nodeElement.lon;
    const lat = System.mercator(nodeElement.lat);
    const heightToWidthRatio = (maxlon - minlon) * (1 / (maxlat - minlat));

    let x = System.normaliseByRange(lon, minlon, maxlon) * canvasHeight;
    let y = System.normaliseByRange(lat, minlat, maxlat) * canvasHeight;

    x *= heightToWidthRatio;
    y = canvasHeight - y;

    return {
      x: x,
      y: y,
    };
  }
}

class Edge {
  graph: Graph;
  nodeA: Node;
  nodeB: Node;
  path: number[];
  active: boolean;

  constructor(nodeA: Node, nodeB: Node, path: number[], graph: Graph) {
    this.graph = graph;
    this.nodeA = nodeA;
    this.nodeB = nodeB;
    this.path = path;
    this.active = false;
  }
}
