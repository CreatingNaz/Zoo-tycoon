import { Container, Graphics } from 'pixi.js';
import { TileMap, TileType, TILE_PROPERTIES } from '../world/TileMap';
import { tileToScreen, TILE_WIDTH, TILE_HEIGHT } from '../utils/IsoMath';
import { Camera } from './Camera';

/** Renders the isometric tile map using diamond-shaped tiles */
export class IsometricRenderer {
  readonly container: Container;
  private tileGraphics: Graphics;
  private highlightGraphics: Graphics;
  private tileMap: TileMap;
  private camera: Camera;

  /** Currently highlighted tile */
  highlightX: number = -1;
  highlightY: number = -1;

  constructor(tileMap: TileMap, camera: Camera) {
    this.tileMap = tileMap;
    this.camera = camera;

    this.container = new Container();
    this.tileGraphics = new Graphics();
    this.highlightGraphics = new Graphics();

    this.container.addChild(this.tileGraphics);
    this.container.addChild(this.highlightGraphics);
  }

  /** Render all visible tiles */
  render(): void {
    this.tileGraphics.clear();
    this.highlightGraphics.clear();

    const transform = this.camera.getContainerTransform();
    this.container.x = transform.x;
    this.container.y = transform.y;
    this.container.scale.set(transform.scale);

    // Calculate visible tile range based on camera viewport
    const margin = 4; // extra tiles beyond viewport edges
    const topLeft = this.camera.screenToWorld(0, 0);
    const topRight = this.camera.screenToWorld(this.camera.viewportWidth, 0);
    const bottomLeft = this.camera.screenToWorld(0, this.camera.viewportHeight);
    const bottomRight = this.camera.screenToWorld(this.camera.viewportWidth, this.camera.viewportHeight);

    // Find min/max tile coordinates that could be visible
    const allX = [topLeft.x, topRight.x, bottomLeft.x, bottomRight.x];
    const allY = [topLeft.y, topRight.y, bottomLeft.y, bottomRight.y];
    const worldMinX = Math.min(...allX);
    const worldMaxX = Math.max(...allX);
    const worldMinY = Math.min(...allY);
    const worldMaxY = Math.max(...allY);

    // Convert world bounds to tile range (conservative)
    const tileMinX = Math.floor((worldMinX / TILE_WIDTH + worldMinY / TILE_HEIGHT)) - margin;
    const tileMaxX = Math.ceil((worldMaxX / TILE_WIDTH + worldMaxY / TILE_HEIGHT)) + margin;
    const tileMinY = Math.floor((worldMinY / TILE_HEIGHT - worldMaxX / TILE_WIDTH)) - margin;
    const tileMaxY = Math.ceil((worldMaxY / TILE_HEIGHT - worldMinX / TILE_WIDTH)) + margin;

    // Render tiles in painter's order (back to front)
    for (let ty = Math.max(0, tileMinY); ty < Math.min(this.tileMap.height, tileMaxY); ty++) {
      for (let tx = Math.max(0, tileMinX); tx < Math.min(this.tileMap.width, tileMaxX); tx++) {
        const cell = this.tileMap.getCell(tx, ty);
        if (!cell) continue;

        const props = TILE_PROPERTIES[cell.type];
        const screen = tileToScreen(tx, ty);

        this.drawDiamondTile(this.tileGraphics, screen.x, screen.y, props.color, cell.type);
      }
    }

    // Draw highlight on hovered tile
    if (this.highlightX >= 0 && this.highlightY >= 0) {
      const screen = tileToScreen(this.highlightX, this.highlightY);
      this.drawTileHighlight(screen.x, screen.y);
    }
  }

  /** Draw a single isometric diamond tile */
  private drawDiamondTile(g: Graphics, x: number, y: number, color: number, type: TileType): void {
    const hw = TILE_WIDTH / 2;
    const hh = TILE_HEIGHT / 2;

    // Top face (main visible surface)
    g.poly([
      x + hw, y,         // top
      x + TILE_WIDTH, y + hh,  // right
      x + hw, y + TILE_HEIGHT, // bottom
      x, y + hh,         // left
    ]);
    g.fill({ color });

    // Left edge (darker shade for depth)
    const edgeHeight = 6;
    g.poly([
      x, y + hh,
      x + hw, y + TILE_HEIGHT,
      x + hw, y + TILE_HEIGHT + edgeHeight,
      x, y + hh + edgeHeight,
    ]);
    g.fill({ color: this.darken(color, 0.6) });

    // Right edge (medium shade)
    g.poly([
      x + hw, y + TILE_HEIGHT,
      x + TILE_WIDTH, y + hh,
      x + TILE_WIDTH, y + hh + edgeHeight,
      x + hw, y + TILE_HEIGHT + edgeHeight,
    ]);
    g.fill({ color: this.darken(color, 0.75) });

    // Outline
    g.poly([
      x + hw, y,
      x + TILE_WIDTH, y + hh,
      x + hw, y + TILE_HEIGHT,
      x, y + hh,
    ]);
    g.stroke({ color: this.darken(color, 0.5), width: 0.5, alpha: 0.3 });

    // Add water shimmer effect
    if (type === TileType.Water || type === TileType.DeepWater) {
      const time = performance.now() * 0.001;
      const shimmerAlpha = 0.1 + Math.sin(time * 2 + x * 0.1 + y * 0.1) * 0.05;
      g.poly([
        x + hw, y,
        x + TILE_WIDTH, y + hh,
        x + hw, y + TILE_HEIGHT,
        x, y + hh,
      ]);
      g.fill({ color: 0xffffff, alpha: shimmerAlpha });
    }
  }

  /** Draw highlight diamond over a tile */
  private drawTileHighlight(x: number, y: number): void {
    const hw = TILE_WIDTH / 2;
    const hh = TILE_HEIGHT / 2;

    this.highlightGraphics.poly([
      x + hw, y,
      x + TILE_WIDTH, y + hh,
      x + hw, y + TILE_HEIGHT,
      x, y + hh,
    ]);
    this.highlightGraphics.fill({ color: 0xffffff, alpha: 0.15 });
    this.highlightGraphics.stroke({ color: 0x64ffda, width: 2, alpha: 0.8 });
  }

  /** Darken a color by a factor */
  private darken(color: number, factor: number): number {
    const r = Math.floor(((color >> 16) & 0xff) * factor);
    const g = Math.floor(((color >> 8) & 0xff) * factor);
    const b = Math.floor((color & 0xff) * factor);
    return (r << 16) | (g << 8) | b;
  }

  /** Set which tile to highlight */
  setHighlight(tx: number, ty: number): void {
    this.highlightX = tx;
    this.highlightY = ty;
  }

  /** Clear the highlight */
  clearHighlight(): void {
    this.highlightX = -1;
    this.highlightY = -1;
  }
}
