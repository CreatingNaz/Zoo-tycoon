import { Entity } from './Entity';
import { SpriteEntity } from '../engine/SpriteRenderer';
import { StaffRole } from '../data/staff';

/** Staff behavior states */
export enum StaffState {
  Walking = 'walking',
  Working = 'working',
  Idle = 'idle',
}

/** A staff member walking the zoo and performing tasks */
export class Staff extends Entity {
  readonly role: StaffRole;
  state: StaffState = StaffState.Idle;

  /** Tile path the staff member is following */
  path: { x: number; y: number }[] = [];
  private pathIndex = 0;

  /** Time spent in current state (ms) */
  private stateTimer = 0;
  private stateDuration = 0;

  /** Habitat IDs this staff has serviced recently (cooldown) */
  readonly servicedHabitats = new Map<number, number>(); // habitatId -> timestamp

  /** Tile where this staff member was hired (home base) */
  homeX: number;
  homeY: number;

  constructor(role: StaffRole, tileX: number, tileY: number) {
    super(tileX, tileY);
    this.role = role;
    this.homeX = tileX;
    this.homeY = tileY;
  }

  update(deltaMs: number): void {
    this.stateTimer += deltaMs;

    switch (this.state) {
      case StaffState.Walking:
        this.setAnimation('walk', 8, 180);
        this.followPath(deltaMs);
        break;

      case StaffState.Working:
        this.setAnimation('idle', 4, 300);
        if (this.stateTimer >= this.stateDuration) {
          this.state = StaffState.Idle;
          this.stateTimer = 0;
        }
        break;

      case StaffState.Idle:
        this.setAnimation('idle', 4, 400);
        break;
    }
  }

  /** Start working at a location */
  startWorking(duration?: number): void {
    this.state = StaffState.Working;
    this.stateTimer = 0;
    this.stateDuration = duration ?? this.role.taskDuration;
  }

  /** Set a new path to follow */
  setPath(path: { x: number; y: number }[]): void {
    this.path = path;
    this.pathIndex = 0;
    if (path.length > 0) {
      this.state = StaffState.Walking;
      this.stateTimer = 0;
    }
  }

  /** Whether the staff has reached the end of their path */
  hasReachedPathEnd(): boolean {
    return this.pathIndex >= this.path.length;
  }

  /** Whether this staff member is available for a new task */
  isAvailable(): boolean {
    return this.state === StaffState.Idle;
  }

  /** Check if a habitat was recently serviced (30s cooldown) */
  hasRecentlyServiced(habitatId: number): boolean {
    const lastTime = this.servicedHabitats.get(habitatId);
    if (lastTime == null) return false;
    return (Date.now() - lastTime) < 30000;
  }

  /** Mark a habitat as serviced */
  markServiced(habitatId: number): void {
    this.servicedHabitats.set(habitatId, Date.now());
  }

  private followPath(deltaMs: number): void {
    if (this.pathIndex >= this.path.length) {
      this.state = StaffState.Idle;
      return;
    }

    const target = this.path[this.pathIndex];
    const arrived = this.moveToward(target.x + 0.5, target.y + 0.5, this.role.speed, deltaMs);
    if (arrived) {
      this.pathIndex++;
      if (this.pathIndex >= this.path.length) {
        this.state = StaffState.Idle;
      }
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
      color: this.role.color,
      label: this.role.name.charAt(0),
      size: 'small',
    };
  }
}
