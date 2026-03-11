import { Entity } from './Entity';
import { SpriteEntity } from '../engine/SpriteRenderer';
import { HabitatType, FoodType } from '../data/habitats';

/** Animal behavior states */
export enum AnimalState {
  Idle = 'idle',
  Walking = 'walking',
  Eating = 'eating',
  Sleeping = 'sleeping',
  Swimming = 'swimming',
}

/** Species definition loaded from data/species.ts */
export interface SpeciesData {
  id: string;
  name: string;
  category: 'reptile' | 'ocean' | 'amphibian' | 'insect' | 'arachnid' | 'deep_sea';
  size: 'small' | 'medium' | 'large';
  color: number;
  /** Tiles per second movement speed */
  moveSpeed: number;
  /** Can this species swim? */
  canSwim: boolean;
  /** Animations available */
  animations: string[];
  /** Required habitat type */
  habitatType: HabitatType;
  /** Food this species eats */
  foodType: FoodType;
  /** Minimum tiles of space per animal */
  spacePerAnimal: number;
  /** Species IDs this animal can coexist with */
  compatibleWith: string[];
}

/** Happiness breakdown for UI display */
export interface HappinessFactors {
  terrain: number;       // 0-25: habitat terrain match
  space: number;         // 0-20: enough room
  food: number;          // 0-20: has feeding station
  enrichment: number;    // 0-20: enrichment items present
  companions: number;    // 0-15: compatible neighbors
}

/** An animal living in the zoo */
export class Animal extends Entity {
  readonly species: SpeciesData;
  state: AnimalState = AnimalState.Idle;
  happiness = 50;

  /** Per-factor happiness breakdown */
  happinessFactors: HappinessFactors = {
    terrain: 0, space: 0, food: 0, enrichment: 0, companions: 0,
  };

  /** Which habitat this animal is assigned to (null = free roaming demo) */
  habitatId: number | null = null;

  // Movement
  private targetX: number;
  private targetY: number;
  private stateTimer = 0;
  private stateDuration = 0;

  // Habitat bounds
  boundsMinX: number;
  boundsMinY: number;
  boundsMaxX: number;
  boundsMaxY: number;

  constructor(species: SpeciesData, tileX: number, tileY: number,
              boundsMinX: number, boundsMinY: number,
              boundsMaxX: number, boundsMaxY: number) {
    super(tileX, tileY);
    this.species = species;
    this.targetX = tileX;
    this.targetY = tileY;
    this.boundsMinX = boundsMinX;
    this.boundsMinY = boundsMinY;
    this.boundsMaxX = boundsMaxX;
    this.boundsMaxY = boundsMaxY;

    this.chooseNewBehavior();
  }

  /** Update happiness from external factors calculation */
  setHappiness(factors: HappinessFactors): void {
    this.happinessFactors = factors;
    this.happiness = factors.terrain + factors.space + factors.food
                   + factors.enrichment + factors.companions;
  }

  update(deltaMs: number): void {
    this.stateTimer += deltaMs;

    switch (this.state) {
      case AnimalState.Idle:
        this.setAnimation('idle', 4, 300);
        if (this.stateTimer >= this.stateDuration) {
          this.chooseNewBehavior();
        }
        break;

      case AnimalState.Walking: {
        this.setAnimation('walk', 8, 150);
        const arrived = this.moveToward(
          this.targetX, this.targetY,
          this.species.moveSpeed, deltaMs
        );
        if (arrived) {
          this.setState(AnimalState.Idle, 2000 + Math.random() * 4000);
        }
        break;
      }

      case AnimalState.Eating:
        this.setAnimation('eat', 6, 250);
        if (this.stateTimer >= this.stateDuration) {
          this.happiness = Math.min(100, this.happiness + 5);
          this.chooseNewBehavior();
        }
        break;

      case AnimalState.Sleeping:
        this.setAnimation('sleep', 2, 800);
        if (this.stateTimer >= this.stateDuration) {
          this.happiness = Math.min(100, this.happiness + 3);
          this.chooseNewBehavior();
        }
        break;

      case AnimalState.Swimming:
        this.setAnimation('swim', 6, 200);
        const swimArrived = this.moveToward(
          this.targetX, this.targetY,
          this.species.moveSpeed * 0.7, deltaMs
        );
        if (swimArrived) {
          this.setState(AnimalState.Idle, 1000 + Math.random() * 2000);
        }
        break;
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
      color: this.species.color,
      label: this.species.name,
      size: this.species.size,
    };
  }

  private setState(state: AnimalState, duration: number): void {
    this.state = state;
    this.stateTimer = 0;
    this.stateDuration = duration;
  }

  private chooseNewBehavior(): void {
    const roll = Math.random();

    if (roll < 0.4) {
      // Walk to random point within bounds
      this.targetX = this.boundsMinX + Math.random() * (this.boundsMaxX - this.boundsMinX);
      this.targetY = this.boundsMinY + Math.random() * (this.boundsMaxY - this.boundsMinY);
      this.setState(AnimalState.Walking, 10000); // timeout safety
    } else if (roll < 0.6) {
      // Eat
      this.setState(AnimalState.Eating, 3000 + Math.random() * 3000);
    } else if (roll < 0.75) {
      // Sleep
      this.setState(AnimalState.Sleeping, 5000 + Math.random() * 5000);
    } else if (roll < 0.85 && this.species.canSwim) {
      // Swim
      this.targetX = this.boundsMinX + Math.random() * (this.boundsMaxX - this.boundsMinX);
      this.targetY = this.boundsMinY + Math.random() * (this.boundsMaxY - this.boundsMinY);
      this.setState(AnimalState.Swimming, 10000);
    } else {
      // Idle
      this.setState(AnimalState.Idle, 2000 + Math.random() * 5000);
    }
  }
}
