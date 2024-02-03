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

  updateMouse(mouse: Mouse) {
    this.mouse = mouse;

    if (this.mouse.isRightHeld) {
      this.offset.x +=
        (this.mouse.x - this.mouse.initx) / this.mouse.scrollScale;
      this.offset.y +=
        (this.mouse.y - this.mouse.inity) / this.mouse.scrollScale;
      this.mouse.initx = this.mouse.x;
      this.mouse.inity = this.mouse.y;
    }
  }

  randColor() {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgb(${r},${g},${b})`;
  }

  applyOffset(x: number, y: number) {
    return {
      x: (x + this.offset.x) * this.mouse.scrollScale,
      y: (y + this.offset.y) * this.mouse.scrollScale,
    };
  }

  removeOffset(x: number, y: number) {
    return {
      x: x / this.mouse.scrollScale + this.offset.x,
      y: y / this.mouse.scrollScale + this.offset.y,
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

  drawNodes(ctx: CanvasRenderingContext2D, activeOnly = false) {
    for (const id of this.adjList.keys()) {
      const node = this.nodes.get(id);
      if (!node) continue;
      const active = node.update();
      if (activeOnly && active) {
        node.draw(ctx);
      } else if (!activeOnly) {
        node.draw(ctx);
      }
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

  draw(ctx: CanvasRenderingContext2D, activeOnly = false) {
    const { x, y } = this.graph.system.applyOffset(this.x, this.y);

    ctx.beginPath();
    ctx.arc(x, y, this.radius, 0, Math.PI * 2);
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

  update() {
    const { x, y } = this.graph.system.applyOffset(this.x, this.y);
    const distance = Math.hypot(
      this.graph.system.mouse.x - x,
      this.graph.system.mouse.y - y,
    );

    if (this.graph.activeNodes.includes(this.id)) {
      this.color = "green";
      this.radius = 10;
      return true;
    }

    if (distance < 10) {
      this.color = "red";

      if (this.graph.system.mouse.isLeftClicked) {
        console.log(this.id, this.x, this.y);
        this.graph.addActiveNode(this.id);
      }
      return true;
    } else {
      this.color = "black";
      this.radius = 5;
      return false;
    }
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

  draw(ctx: CanvasRenderingContext2D) {
    if (this.active) {
      ctx.strokeStyle = "red";
    } else {
      ctx.strokeStyle = "black";
    }

    const aCoords = this.graph.system.applyOffset(this.nodeA.x, this.nodeA.y);
    const bCoords = this.graph.system.applyOffset(this.nodeB.x, this.nodeB.y);

    ctx.beginPath();
    ctx.moveTo(aCoords.x, aCoords.y);

    for (const id of this.path) {
      const pathNode = this.graph.nodes.get(id);
      if (!pathNode) continue;
      const pathCoords = this.graph.system.applyOffset(pathNode.x, pathNode.y);
      ctx.lineTo(pathCoords.x, pathCoords.y);
    }

    ctx.lineTo(bCoords.x, bCoords.y);
    ctx.stroke();
  }
}
