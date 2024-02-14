import type { Bounds, Element, NominatimQuery } from "./osm";

export class System {
  private static _instance: System;
  private static _canvas: HTMLCanvasElement;
  private static _bounds: Bounds;
  private static _query: NominatimQuery;
  private static _newQuery: boolean;

  constructor(canvas: HTMLCanvasElement) {
    if (!System._instance) {
      System._instance = this;
      System._canvas = canvas;
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

  static hasChangedQuery() {
    if (System._newQuery) {
      System._newQuery = false;
      return true;
    }
    return false;
  }

  static setQuery(query: NominatimQuery) {
    if (!System._query) {
      System._newQuery = false;
    } else {
      System._newQuery = true;
    }
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
