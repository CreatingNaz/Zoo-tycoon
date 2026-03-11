import { Direction, SpriteEntity } from '../engine/SpriteRenderer';

/** Base class for all game entities (animals, visitors, staff) */
export abstract class Entity {
  readonly id: string;
  tileX: number;
  tileY: number;
  direction: Direction = 'SE';
  animation = 'idle';
  frame = 0;
  frameTimer = 0;
  frameDuration = 200;
  frameCount = 4;

  protected static nextId = 0;

  constructor(tileX: number, tileY: number) {
    this.id = `${this.constructor.name}_${Entity.nextId++}`;
    this.tileX = tileX;
    this.tileY = tileY;
  }

  /** Update entity logic each tick */
  abstract update(deltaMs: number): void;

  /** Get the sprite rendering data for this entity */
  abstract toSpriteEntity(): SpriteEntity;

  /** Set animation, resetting frame if changed */
  protected setAnimation(name: string, frameCount: number, frameDuration: number = 200): void {
    if (this.animation !== name) {
      this.animation = name;
      this.frame = 0;
      this.frameTimer = 0;
      this.frameCount = frameCount;
      this.frameDuration = frameDuration;
    }
  }

  /** Move toward a target tile position at a given speed */
  protected moveToward(targetX: number, targetY: number, speed: number, deltaMs: number): boolean {
    const dx = targetX - this.tileX;
    const dy = targetY - this.tileY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.05) {
      this.tileX = targetX;
      this.tileY = targetY;
      return true; // Arrived
    }

    const step = (speed * deltaMs) / 1000;
    const move = Math.min(step, dist);
    this.tileX += (dx / dist) * move;
    this.tileY += (dy / dist) * move;

    // Update facing direction based on movement
    this.direction = this.getDirection(dx, dy);

    return false;
  }

  /** Determine facing direction from movement delta */
  protected getDirection(dx: number, dy: number): Direction {
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'SE' : 'NW';
    }
    return dy > 0 ? 'SW' : 'NE';
  }
}
