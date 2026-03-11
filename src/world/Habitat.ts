import { TileMap, TileType } from './TileMap';

/** A detected habitat enclosure */
export interface Habitat {
  id: number;
  /** Tiles inside the enclosure (not including fence tiles) */
  tiles: { x: number; y: number }[];
  /** Fence tiles forming the boundary */
  fenceTiles: { x: number; y: number }[];
  /** Terrain type breakdown inside the habitat */
  terrainCounts: Partial<Record<TileType, number>>;
  /** Total area in tiles */
  area: number;
}

/** Detects enclosed habitats formed by fence tiles on the map */
export class HabitatDetector {
  private tileMap: TileMap;
  private habitats: Habitat[] = [];
  private nextId = 1;

  constructor(tileMap: TileMap) {
    this.tileMap = tileMap;
  }

  /** Get all currently detected habitats */
  getHabitats(): Habitat[] {
    return this.habitats;
  }

  /** Re-scan the entire map for enclosed habitats.
   *  Uses flood fill from edges to find areas NOT reachable
   *  from outside any fence boundary. */
  detectAll(): Habitat[] {
    const w = this.tileMap.width;
    const h = this.tileMap.height;

    // Step 1: Flood fill from edges to mark all tiles reachable from outside
    const outside = new Uint8Array(w * h);
    const queue: number[] = [];

    // Seed edges
    for (let x = 0; x < w; x++) {
      this.seedIfOpen(x, 0, w, outside, queue);
      this.seedIfOpen(x, h - 1, w, outside, queue);
    }
    for (let y = 0; y < h; y++) {
      this.seedIfOpen(0, y, w, outside, queue);
      this.seedIfOpen(w - 1, y, w, outside, queue);
    }

    // BFS flood fill
    while (queue.length > 0) {
      const idx = queue.pop()!;
      const x = idx % w;
      const y = (idx - x) / w;

      for (const [nx, ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) {
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const ni = ny * w + nx;
        if (outside[ni]) continue;

        const type = this.tileMap.getType(nx, ny);
        if (TileMap.isFence(type)) continue; // fences block flood

        outside[ni] = 1;
        queue.push(ni);
      }
    }

    // Step 2: Find connected components of non-outside, non-fence tiles
    const visited = new Uint8Array(w * h);
    this.habitats = [];
    this.nextId = 1;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (outside[idx] || visited[idx]) continue;

        const type = this.tileMap.getType(x, y);
        if (TileMap.isFence(type)) continue;

        // Found an interior tile — flood fill to collect the habitat
        const habitat = this.floodCollect(x, y, w, h, outside, visited);
        if (habitat && habitat.area >= 4) { // minimum 4 tiles to count
          this.habitats.push(habitat);
        }
      }
    }

    return this.habitats;
  }

  /** Seed a tile for outside flood fill if it's not a fence */
  private seedIfOpen(x: number, y: number, w: number, outside: Uint8Array, queue: number[]): void {
    const idx = y * w + x;
    if (outside[idx]) return;
    const type = this.tileMap.getType(x, y);
    if (TileMap.isFence(type)) return;
    outside[idx] = 1;
    queue.push(idx);
  }

  /** Flood fill from a starting interior tile, collecting all connected interior tiles */
  private floodCollect(
    startX: number, startY: number,
    w: number, h: number,
    outside: Uint8Array, visited: Uint8Array
  ): Habitat | null {
    const tiles: { x: number; y: number }[] = [];
    const fenceSet = new Set<string>();
    const terrainCounts: Partial<Record<TileType, number>> = {};
    const queue = [startY * w + startX];
    visited[startY * w + startX] = 1;

    while (queue.length > 0) {
      const idx = queue.pop()!;
      const x = idx % w;
      const y = (idx - x) / w;

      const type = this.tileMap.getType(x, y);
      tiles.push({ x, y });
      terrainCounts[type] = (terrainCounts[type] || 0) + 1;

      for (const [nx, ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) {
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const ni = ny * w + nx;

        const ntype = this.tileMap.getType(nx, ny);
        if (TileMap.isFence(ntype)) {
          fenceSet.add(`${nx},${ny}`);
          continue;
        }

        if (outside[ni] || visited[ni]) continue;
        visited[ni] = 1;
        queue.push(ni);
      }
    }

    const fenceTiles = [...fenceSet].map(s => {
      const [fx, fy] = s.split(',').map(Number);
      return { x: fx, y: fy };
    });

    return {
      id: this.nextId++,
      tiles,
      fenceTiles,
      terrainCounts,
      area: tiles.length,
    };
  }
}
