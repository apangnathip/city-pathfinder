import type { Bounds, Element, NodeElement } from "./osm";

type Range = { min: number; max: number };
type Coord = { x: number; y: number };

type Mouse = {
  x: number;
  y: number;
  isLeftClicked: boolean;
};

export class System {
  canvasHeight: number;
  initialMapScaling: number;
  xRange: Range;
  yRange: Range;
  mouse: Mouse;

  constructor(bbox: Bounds, canvasHeight: number, initialMapScaling: number) {
    this.canvasHeight = canvasHeight;
    this.mouse = { x: 0, y: 0, isLeftClicked: false };
    this.initialMapScaling = initialMapScaling;
    this.xRange = { min: bbox.minlon, max: bbox.maxlon };
    this.yRange = { min: bbox.minlat, max: bbox.maxlat };
  }

  updateMouse(mouse: Mouse) {
    this.mouse = mouse;
  }

  randColor() {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgb(${r},${g},${b})`;
  }
}

export class Graph {
  system: System;
  adjList: Map<number, Map<number, Edge>>;
  nodes: Map<number, Node>;
  pathNodePos: Map<number, Coord>;
  travelled: Map<number, boolean>;

  constructor(elements: Element[], system: System) {
    this.system = system;
    this.adjList = new Map();
    this.nodes = new Map();
    this.pathNodePos = new Map();
    this.travelled = new Map();

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
          this.nodes.set(element.id, new Node(element, this.system));
        }
        if (linkCounter.get(element.id) > 1) {
          this.addNodeToAdj(element.id);
        }
      }
    }

    for (const element of elements) {
      if (element.type === "way") {
        let path = [];
        let start = this.nodes.get(element.nodes[0]);
        const end = this.nodes.get(element.nodes[element.nodes.length - 1]);
        if (!start || !end) continue;

        for (const nodeID of element.nodes.slice(1, -1)) {
          const currentNode = this.nodes.get(nodeID);

          if (linkCounter.get(nodeID) > 1) {
            if (!currentNode) continue;

            const edge = new Edge(start, currentNode, path);
            this.addEdge(edge);

            start = currentNode;
            path = [];
          } else {
            path.push(nodeID);
          }
        }

        const endEdge = new Edge(start, end, path);
        this.addEdge(endEdge);
      }
    }
  }

  addNodeToAdj(id: number) {
    this.adjList.set(id, new Map());
  }

  addEdge(edge: Edge) {
    this.adjList.get(edge.nodeA.id)?.set(edge.nodeB.id, edge);
    this.adjList.get(edge.nodeB.id)?.set(edge.nodeA.id, edge);
  }

  drawNodes(ctx: CanvasRenderingContext2D) {
    for (const id of this.adjList.keys()) {
      const node = this.nodes.get(id);
      if (!node) continue;

      const activeID = node.update();
      if (activeID) {
        console.log(this.adjList.get(activeID));
      }

      node.draw(ctx);
    }
  }

  drawEdges(ctx: CanvasRenderingContext2D) {
    for (const [startID, adj] of this.adjList.entries()) {
      const startNode = this.nodes.get(startID);
      if (!startNode) continue;

      for (const edge of adj.values()) {
        edge.draw(ctx);
      }
    }
  }
}

class Node {
  system: System;
  id: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  hoverRadius = 2;

  constructor(nodeElement: NodeElement, system: System) {
    this.system = system;
    this.radius = 5;
    this.color = "black";
    this.id = nodeElement.id;

    const coords = this.normalizeCoord(nodeElement);
    this.x = coords.x;
    this.y = coords.y;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
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
        this.system.xRange,
        this.system.initialMapScaling,
      ),
      y:
        this.system.canvasHeight -
        this.normalizeNumber(
          nodeElement.lat,
          this.system.yRange,
          this.system.initialMapScaling,
        ),
    };
  }

  update() {
    const distance = Math.hypot(
      this.system.mouse.x - this.x,
      this.system.mouse.y - this.y,
    );

    if (distance < 10) {
      this.color = "red";
      this.radius = 10;

      if (this.system.mouse.isLeftClicked) {
        console.log(this.id, this.x, this.y);
        return this.id;
      }
    } else {
      this.color = "black";
      this.radius = 5;
    }
  }
}

class Edge {
  nodeA: Node;
  nodeB: Node;
  path: number[];

  constructor(nodeA: Node, nodeB: Node, path: number[]) {
    this.nodeA = nodeA;
    this.nodeB = nodeB;
    this.path = path;
  }

  // Full path is not yet drawn due to connective issues
  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.moveTo(this.nodeA.x, this.nodeA.y);
    ctx.lineTo(this.nodeB.x, this.nodeB.y);
    ctx.stroke();
  }
}
