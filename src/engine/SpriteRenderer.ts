import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Camera } from './Camera';
import { tileToScreen, TILE_WIDTH, TILE_HEIGHT } from '../utils/IsoMath';

/** Direction for sprite facing */
export type Direction = 'SE' | 'SW' | 'NW' | 'NE';

/** A renderable entity on the isometric map */
export interface SpriteEntity {
  id: string;
  /** Tile position (can be fractional for smooth movement) */
  tileX: number;
  tileY: number;
  /** Current animation */
  animation: string;
  /** Facing direction */
  direction: Direction;
  /** Current frame index */
  frame: number;
  /** Frame timer (ms elapsed since last frame change) */
  frameTimer: number;
  /** Frame duration in ms */
  frameDuration: number;
  /** Total frames in current animation */
  frameCount: number;
  /** Display color (for placeholder rendering) */
  color: number;
  /** Display label */
  label: string;
  /** Size category */
  size: 'small' | 'medium' | 'large';
}

/** Renders entity sprites on top of the tile map */
export class SpriteRenderer {
  readonly container = new Container();
  private camera: Camera;
  private entityGraphics = new Map<string, Container>();

  constructor(camera: Camera) {
    this.camera = camera;
    this.container.label = 'sprite-layer';
  }

  /** Update and render all entities */
  render(entities: SpriteEntity[], deltaMs: number): void {
    const activeIds = new Set<string>();

    // Sort entities by depth (back to front)
    const sorted = [...entities].sort((a, b) => {
      return (a.tileX + a.tileY) - (b.tileX + b.tileY);
    });

    for (const entity of sorted) {
      activeIds.add(entity.id);

      // Advance animation
      entity.frameTimer += deltaMs;
      if (entity.frameTimer >= entity.frameDuration) {
        entity.frameTimer -= entity.frameDuration;
        entity.frame = (entity.frame + 1) % entity.frameCount;
      }

      // Get or create container for this entity
      let entityContainer = this.entityGraphics.get(entity.id);
      if (!entityContainer) {
        entityContainer = new Container();
        this.container.addChild(entityContainer);
        this.entityGraphics.set(entity.id, entityContainer);
      }

      // Calculate screen position
      const screen = tileToScreen(entity.tileX, entity.tileY);

      // Position at tile center, offset up so entity sits on tile
      entityContainer.x = screen.x + TILE_WIDTH / 2;
      entityContainer.y = screen.y + TILE_HEIGHT / 2;

      // Rebuild placeholder sprite
      entityContainer.removeChildren();
      this.drawPlaceholderSprite(entityContainer, entity);
    }

    // Remove entities that are no longer active
    for (const [id, container] of this.entityGraphics) {
      if (!activeIds.has(id)) {
        this.container.removeChild(container);
        container.destroy({ children: true });
        this.entityGraphics.delete(id);
      }
    }
  }

  /** Draw a colored placeholder sprite for an entity */
  private drawPlaceholderSprite(container: Container, entity: SpriteEntity): void {
    const g = new Graphics();

    const sizes = { small: 12, medium: 18, large: 26 };
    const r = sizes[entity.size];

    // Body (circle with bounce animation)
    const bounceOffset = Math.sin(entity.frame * Math.PI / 2) * 2;

    g.circle(0, -r - bounceOffset, r);
    g.fill({ color: entity.color, alpha: 0.9 });
    g.stroke({ color: 0x000000, width: 1.5, alpha: 0.5 });

    // Direction indicator (small triangle showing facing)
    const dirAngles: Record<Direction, number> = {
      SE: Math.PI / 4,
      SW: (3 * Math.PI) / 4,
      NW: (5 * Math.PI) / 4,
      NE: (7 * Math.PI) / 4,
    };
    const angle = dirAngles[entity.direction];
    const indicatorDist = r + 4;
    const ix = Math.cos(angle) * indicatorDist;
    const iy = -r + Math.sin(angle) * indicatorDist - bounceOffset;
    g.circle(ix, iy, 3);
    g.fill({ color: 0xffffff, alpha: 0.8 });

    // Shadow ellipse on ground
    g.ellipse(0, 0, r * 0.8, r * 0.3);
    g.fill({ color: 0x000000, alpha: 0.2 });

    container.addChild(g);

    // Label text
    const style = new TextStyle({
      fontSize: 9,
      fill: 0xffffff,
      fontFamily: 'monospace',
      stroke: { color: 0x000000, width: 2 },
    });
    const text = new Text({ text: entity.label, style });
    text.anchor.set(0.5, 1);
    text.y = -r * 2 - bounceOffset - 4;
    container.addChild(text);
  }

  /** Clear all rendered sprites */
  clear(): void {
    for (const [, container] of this.entityGraphics) {
      container.destroy({ children: true });
    }
    this.entityGraphics.clear();
    this.container.removeChildren();
  }
}
