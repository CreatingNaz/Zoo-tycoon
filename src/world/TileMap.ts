/** Tile types that can exist on the map */
export enum TileType {
  Grass = 'grass',
  Water = 'water',
  Sand = 'sand',
  Path = 'path',
  Dirt = 'dirt',
  Rock = 'rock',
  DeepWater = 'deep_water',
  FenceWire = 'fence_wire',
  FenceGlass = 'fence_glass',
  FenceWall = 'fence_wall',
  FenceWooden = 'fence_wooden',
}

/** Visual and gameplay properties for each tile type */
export interface TileProperties {
  color: number;
  walkable: boolean;
  buildable: boolean;
  label: string;
}

export const TILE_PROPERTIES: Record<TileType, TileProperties> = {
  [TileType.Grass]:     { color: 0x4a7c59, walkable: true,  buildable: true,  label: 'Grass' },
  [TileType.Water]:     { color: 0x3d85c6, walkable: false, buildable: false, label: 'Water' },
  [TileType.Sand]:      { color: 0xd4a574, walkable: true,  buildable: true,  label: 'Sand' },
  [TileType.Path]:      { color: 0x8b8b83, walkable: true,  buildable: false, label: 'Path' },
  [TileType.Dirt]:      { color: 0x8b6914, walkable: true,  buildable: true,  label: 'Dirt' },
  [TileType.Rock]:      { color: 0x6b6b6b, walkable: false, buildable: false, label: 'Rock' },
  [TileType.DeepWater]: { color: 0x1a5276, walkable: false, buildable: false, label: 'Deep Water' },
  [TileType.FenceWire]:   { color: 0x888888, walkable: false, buildable: false, label: 'Wire Fence' },
  [TileType.FenceGlass]:  { color: 0x88ccee, walkable: false, buildable: false, label: 'Glass Wall' },
  [TileType.FenceWall]:   { color: 0x666666, walkable: false, buildable: false, label: 'Stone Wall' },
  [TileType.FenceWooden]: { color: 0x8b6b3a, walkable: false, buildable: false, label: 'Wooden Fence' },
};

/** A decoration object placed on a tile */
export interface Decoration {
  id: string;
  color: number;
  label: string;
}

/** Cell data stored in each grid position */
export interface TileCell {
  type: TileType;
  elevation: number;
  decoration?: Decoration;
}

/** Grid-based tile map storing all terrain data */
export class TileMap {
  readonly width: number;
  readonly height: number;
  private cells: TileCell[][];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cells = [];

    for (let y = 0; y < height; y++) {
      this.cells[y] = [];
      for (let x = 0; x < width; x++) {
        this.cells[y][x] = { type: TileType.Grass, elevation: 0 };
      }
    }
  }

  getCell(x: number, y: number): TileCell | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    return this.cells[y][x];
  }

  setCell(x: number, y: number, type: TileType, elevation: number = 0): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const existing = this.cells[y][x];
    this.cells[y][x] = { type, elevation, decoration: existing?.decoration };
  }

  setDecoration(x: number, y: number, decoration: Decoration | undefined): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.cells[y][x].decoration = decoration;
  }

  getType(x: number, y: number): TileType {
    return this.cells[y]?.[x]?.type ?? TileType.Grass;
  }

  /** Check if a tile type is a fence */
  static isFence(type: TileType): boolean {
    return type === TileType.FenceWire
      || type === TileType.FenceGlass
      || type === TileType.FenceWall
      || type === TileType.FenceWooden;
  }

  /** Check if a tile type is a path */
  static isPath(type: TileType): boolean {
    return type === TileType.Path;
  }

  /** Get adjacent path tile positions */
  getAdjacentPathTiles(x: number, y: number): { x: number; y: number }[] {
    const result: { x: number; y: number }[] = [];
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
        if (TileMap.isPath(this.cells[ny][nx].type)) {
          result.push({ x: nx, y: ny });
        }
      }
    }
    return result;
  }

  /** Generate a simple starter map with some variety */
  generateStarterMap(): void {
    const cx = Math.floor(this.width / 2);
    const cy = Math.floor(this.height / 2);

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Pond in the center-right area
        if (Math.abs(x - cx - 8) < 4 && Math.abs(y - cy) < 3) {
          this.setCell(x, y, TileType.Water);
        }
        // Sandy beach around pond
        else if (Math.abs(x - cx - 8) < 6 && Math.abs(y - cy) < 5 && Math.random() < 0.4) {
          this.setCell(x, y, TileType.Sand);
        }
        // A few rock clusters
        else if (dist > 12 && dist < 15 && Math.random() < 0.15) {
          this.setCell(x, y, TileType.Rock);
        }
        // Main path from entrance — extends south to map edge for visitor entrance
        else if ((Math.abs(x - cx) < 1 && y > cy - 10 && y < this.height) ||
                 (Math.abs(y - cy) < 1 && x > cx - 10 && x < cx + 10)) {
          this.setCell(x, y, TileType.Path);
        }
        // Dirt patches
        else if (Math.random() < 0.03) {
          this.setCell(x, y, TileType.Dirt);
        }
        // Everything else is grass
      }
    }
  }
}
