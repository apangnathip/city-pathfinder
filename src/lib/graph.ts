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
  canvasHeight: number;
  initialMapScaling: number;
  xRange: Range;
  yRange: Range;
  mouse: Mouse;
  offset: { x: number; y: number };

  constructor(bbox: Bounds, canvasHeight: number, initialMapScaling: number) {
    this.canvasHeight = canvasHeight;
    this.initialMapScaling = initialMapScaling;
    this.xRange = { min: bbox.minlon, max: bbox.maxlon };
    this.yRange = { min: bbox.minlat, max: bbox.maxlat };
    this.offset = { x: 0, y: 0 };
    this.mouse = {
      x: 0,
      y: 0,
      isLeftClicked: false,
      isRightHeld: false,
      initx: 0,
      inity: 0,
      scrollScale: 0,
    };
  }
}

export class Graph {
  system: System;
  adjList: Map<number, Map<number, Edge>>;
  nodes: Map<number, Node>;
  pathNodePos: Map<number, Coord>;
  travelled: Map<number, boolean>;
  activeNodes: number[];
  isNodeFound: boolean;

  constructor(elements: Element[], system: System) {
    this.system = system;
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
    const indices = [];
    const radius = 5;

    for (const [startID, adj] of this.adjList.entries()) {
      const startNode = this.nodes.get(startID);
      if (!startNode) continue;

      for (const edge of adj.values()) {
        const currIdx = positions.length / 2;

        positions.push(edge.nodeA.x - radius, edge.nodeA.y - radius);
        positions.push(edge.nodeA.x + radius, edge.nodeA.y - radius);
        positions.push(edge.nodeA.x - radius, edge.nodeA.y + radius);
        positions.push(edge.nodeA.x + radius, edge.nodeA.y + radius);

        indices.push(
          currIdx,
          currIdx + 1,
          currIdx + 2,
          currIdx + 2,
          currIdx + 1,
          currIdx + 3,
        );
      }
    }

    // const colors = new Array((positions.length / 2) * 3).fill(0);
    const colors = [];

    for (let i = 0; i < indices.length / 4; i++) {
      colors.push(1, 0, 0);
      colors.push(0, 1, 0);
      colors.push(0, 0, 1);
      colors.push(0, 0, 0);
    }
    return { positions, indices, colors };
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

    const coords = this.normalizeCoord(nodeElement);
    this.x = coords.x;
    this.y = coords.y;
  }

  normalizeNumber(
    number: number,
    range: { min: number; max: number },
    scaling: number,
  ) {
    return ((number - range.min) / (range.max - range.min)) * scaling;
  }

  normalizeCoord(nodeElement: NodeElement) {
    return {
      x: this.normalizeNumber(
        nodeElement.lon,
        this.graph.system.xRange,
        this.graph.system.initialMapScaling,
      ),
      y:
        this.graph.system.canvasHeight -
        this.normalizeNumber(
          nodeElement.lat,
          this.graph.system.yRange,
          this.graph.system.initialMapScaling,
        ),
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
