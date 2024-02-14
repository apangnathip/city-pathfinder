import type { Bounds, CartesianCoords, Element, NominatimQuery } from "./osm";

type Mouse = {
  x: number;
  y: number;
  initx: number;
  inity: number;
  isLeftClicked: boolean;
  isRightHeld: boolean;
};

export class System {
  private static _instance: System;
  private static _canvas: HTMLCanvasElement;
  private static _bounds: Bounds;
  private static _query: NominatimQuery;
  private static _newQuery: boolean;
  private static _offset: CartesianCoords;
  private static _scale: number;
  private static _mouse: Mouse;

  constructor(canvas: HTMLCanvasElement) {
    if (!System._instance) {
      System._instance = this;
      System._canvas = canvas;
      System._offset = { x: (canvas.width - canvas.height) / 2, y: 0 };
      System._scale = 1;
      System._mouse = {
        x: 0,
        y: 0,
        initx: 0,
        inity: 0,
        isLeftClicked: false,
        isRightHeld: false,
      };
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
    return System._bounds;
  }

  static getQuery() {
    return System._query;
  }

  static getScale() {
    return System._scale;
  }

  static getOffset(): [number, number] {
    return [System._offset.x, System._offset.y];
  }

  static getMousePos(): [number, number] {
    return [System._mouse.x, System._mouse.y];
  }

  static getMouseInitPos(): [number, number] {
    return [System._mouse.initx, System._mouse.inity];
  }

  static isMouseButtonPressed(button: number) {
    switch (button) {
      case 0:
        return System._mouse.isLeftClicked;
      case 1:
        return System._mouse.isRightHeld;
    }
  }

  static scaleUp() {
    System._scale *= 0.8;
  }

  static scaleDown() {
    System._scale *= 1.25;
  }

  static resetOffset() {
    System._offset = {
      x: (System._canvas.width - System._canvas.height) / 2,
      y: 0,
    };

    console.log(System._bounds);
    if (System._bounds) {
    }
  }

  static resetScale() {
    System._scale = 1;
  }

  static setOffset(x: number, y: number, mode?: "inc" | "dec") {
    if (mode === "inc") {
      System._offset.x += x;
      System._offset.y += y;
    } else if (mode === "dec") {
      System._offset.x -= x;
      System._offset.y -= y;
    } else {
      System._offset.x = x;
      System._offset.y = y;
    }
  }

  static setMousePos(x: number, y: number) {
    System._mouse.x = x;
    System._mouse.y = y;
  }

  static initMousePos(x: number, y: number) {
    System._mouse.initx = x;
    System._mouse.inity = y;
  }

  // 0 : left, 1: right
  static setMouseButtons(val: boolean, button?: number) {
    if (!button || button === 0) {
      System._mouse.isLeftClicked = val;
    }
    if (!button || button === 1) {
      System._mouse.isRightHeld = val;
    }
  }

  static setQuery(query: NominatimQuery) {
    System._newQuery = true;
    System._query = query;
  }

  static setBounds(elements: Element[]) {
    let minlat, maxlat, minlon, maxlon;
    minlat = minlon = 500;
    maxlat = maxlon = -500;

    for (const element of elements) {
      if (element.type === "node") {
        if (element.lat > maxlat) {
          maxlat = element.lat;
        } else if (element.lat < minlat) {
          minlat = element.lat;
        }

        if (element.lon > maxlon) {
          maxlon = element.lon;
        } else if (element.lon < minlon) {
          minlon = element.lon;
        }
      }
    }

    minlat = System.mercator(minlat);
    maxlat = System.mercator(maxlat);

    System._bounds = { minlat, minlon, maxlat, maxlon };
  }

  static hasChangedQuery() {
    if (System._newQuery) {
      System._newQuery = false;
      return true;
    }
    return false;
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
