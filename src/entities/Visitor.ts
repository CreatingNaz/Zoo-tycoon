import { Entity } from './Entity';
import { SpriteEntity } from '../engine/SpriteRenderer';

/** Visitor behavior states */
export enum VisitorState {
  Walking = 'walking',
  Viewing = 'viewing',
  Eating = 'eating',
  Shopping = 'shopping',
  Leaving = 'leaving',
}

/** A visitor walking through the zoo */
export class Visitor extends Entity {
  state: VisitorState = VisitorState.Walking;
  satisfaction = 50;
  money: number;
  moneySpent = 0;
  readonly viewedHabitats = new Set<number>();

  /** Tile path the visitor is following */
  path: { x: number; y: number }[] = [];
  private pathIndex = 0;

  /** Time spent in current state (ms) */
  private stateTimer = 0;
  private stateDuration = 0;

  /** Total time alive (ms) */
  totalTime = 0;
  /** Max lifetime before leaving (ms) */
  readonly lifetime: number;

  /** Whether this visitor is heading for the exit */
isLeaving = false;

  /** Spawn point to return to when leaving */
  spawnX: number;
  spawnY: number;

  private readonly color: number;

  constructor(tileX: number, tileY: number) {
    super(tileX, tileY);
    this.spawnX = tileX;
    this.spawnY = tileY;
    this.money = 20 + Math.random() * 30; // $20-50 budget
    this.lifetime = 60000 + Math.random() * 30000; // 60-90s

    // Warm-toned visitor colors
    const colors = [0xFFAA44, 0xFF8844, 0xFFCC66, 0xE89040, 0xCC7744, 0xDD9955];
    this.color = colors[Math.floor(Math.random() * colors.length)];
  }

  update(deltaMs: number): void {
    this.totalTime += deltaMs;
    this.stateTimer += deltaMs;

    switch (this.state) {
      case VisitorState.Walking:
        this.setAnimation('walk', 8, 180);
        this.followPath(deltaMs);
        break;

      case VisitorState.Viewing:
        this.setAnimation('idle', 4, 400);
        if (this.stateTimer >= this.stateDuration) {
          this.state = VisitorState.Walking;
          this.stateTimer = 0;
        }
        break;

      case VisitorState.Eating:
      case VisitorState.Shopping:
        this.setAnimation('idle', 4, 300);
        if (this.stateTimer >= this.stateDuration) {
          this.state = VisitorState.Walking;
          this.stateTimer = 0;
        }
        break;

      case VisitorState.Leaving:
        this.setAnimation('walk', 8, 150);
        this.followPath(deltaMs);
        break;
    }
  }

  /** Start viewing a habitat */
  startViewing(habitatId: number, animalHappiness: number): void {
    if (this.viewedHabitats.has(habitatId)) return;
    this.viewedHabitats.add(habitatId);
    this.state = VisitorState.Viewing;
    this.stateTimer = 0;
    this.stateDuration = 3000 + Math.random() * 2000; // 3-5s
    // Satisfaction boost based on animal happiness (0-100 -> 0-10 points)
    this.satisfaction = Math.min(100, this.satisfaction + animalHappiness * 0.1);
  }

  /** Stop at a facility and spend money */
  visitFacility(type: 'food_stall' | 'gift_shop' | 'restroom' | 'info_booth'): number {
    let spent = 0;
    switch (type) {
      case 'food_stall':
        this.state = VisitorState.Eating;
        this.stateDuration = 2000 + Math.random() * 1000;
        spent = 5 + Math.random() * 5;
        this.satisfaction = Math.min(100, this.satisfaction + 5);
        break;
      case 'gift_shop':
        this.state = VisitorState.Shopping;
        this.stateDuration = 2000 + Math.random() * 2000;
        spent = 10 + Math.random() * 10;
        this.satisfaction = Math.min(100, this.satisfaction + 3);
        break;
      case 'restroom':
        this.state = VisitorState.Eating; // reuse state
        this.stateDuration = 1000;
        spent = 0;
        this.satisfaction = Math.min(100, this.satisfaction + 2);
        break;
      case 'info_booth':
        this.state = VisitorState.Eating;
        this.stateDuration = 1500;
        spent = 0;
        this.satisfaction = Math.min(100, this.satisfaction + 4);
        break;
    }
    this.stateTimer = 0;
    spent = Math.min(spent, this.money);
    this.money -= spent;
    this.moneySpent += spent;
    return spent;
  }

  /** Set a new path for the visitor to follow */
  setPath(path: { x: number; y: number }[]): void {
    this.path = path;
    this.pathIndex = 0;
  }

  /** Start leaving the zoo */
  startLeaving(): void {
    this.isLeaving = true;
    this.state = VisitorState.Leaving;
    this.stateTimer = 0;
  }

  /** Whether the visitor has reached the end of their path */
  hasReachedPathEnd(): boolean {
    return this.pathIndex >= this.path.length;
  }

  /** Whether the visitor is currently stopped (viewing/eating/shopping) */
  isStopped(): boolean {
    return this.state === VisitorState.Viewing
      || this.state === VisitorState.Eating
      || this.state === VisitorState.Shopping;
  }

  private followPath(deltaMs: number): void {
    if (this.pathIndex >= this.path.length) return;

    const target = this.path[this.pathIndex];
    const arrived = this.moveToward(target.x + 0.5, target.y + 0.5, 1.8, deltaMs);
    if (arrived) {
      this.pathIndex++;
    }
  }

  toSpriteEntity(): SpriteEntity {
    return {
      id: this.id,
      tileX: this.tileX,
      tileY: this.tileY,
      animation: this.animation,
      direction: this.direction,
      frame: this.frame,
      frameTimer: this.frameTimer,
      frameDuration: this.frameDuration,
      frameCount: this.frameCount,
      color: this.color,
      label: '',
      size: 'small',
    };
  }
}
