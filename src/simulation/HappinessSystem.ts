import { Animal, HappinessFactors } from '../entities/Animal';
import { Habitat } from '../world/Habitat';
import { TileMap, TileType } from '../world/TileMap';
import { HABITAT_TYPES } from '../data/habitats';

/** Evaluates and updates animal happiness based on habitat conditions */
export class HappinessSystem {
  private tileMap: TileMap;

  constructor(tileMap: TileMap) {
    this.tileMap = tileMap;
  }

  /** Recalculate happiness for all animals given current habitats */
  update(animals: Animal[], habitats: Habitat[]): void {
    // Build a map of habitat id -> animals in it
    const habitatAnimals = new Map<number, Animal[]>();
    for (const animal of animals) {
      if (animal.habitatId != null) {
        const list = habitatAnimals.get(animal.habitatId) ?? [];
        list.push(animal);
        habitatAnimals.set(animal.habitatId, list);
      }
    }

    for (const animal of animals) {
      const habitat = animal.habitatId != null
        ? habitats.find(h => h.id === animal.habitatId) ?? null
        : null;
      const neighbors = animal.habitatId != null
        ? (habitatAnimals.get(animal.habitatId) ?? []).filter(a => a !== animal)
        : [];

      const factors = this.evaluate(animal, habitat, neighbors);
      animal.setHappiness(factors);
    }
  }

  /** Calculate happiness factors for a single animal */
  private evaluate(animal: Animal, habitat: Habitat | null, neighbors: Animal[]): HappinessFactors {
    if (!habitat) {
      // Free-roaming demo animals get a flat baseline
      return { terrain: 12, space: 10, food: 10, enrichment: 8, companions: 5 };
    }

    const req = HABITAT_TYPES[animal.species.habitatType];

    return {
      terrain: this.scoreTerrain(habitat, req.preferredTerrain, req.terrainThreshold,
                                 req.needsWater, req.waterThreshold),
      space: this.scoreSpace(habitat, animal, neighbors),
      food: this.scoreFood(habitat),
      enrichment: this.scoreEnrichment(habitat, req.enrichmentItems, req.minEnrichment),
      companions: this.scoreCompanions(animal, neighbors),
    };
  }

  /** Score 0-25: Does the habitat terrain match species requirements? */
  private scoreTerrain(
    habitat: Habitat,
    preferred: TileType[],
    threshold: number,
    needsWater: boolean,
    waterThreshold: number,
  ): number {
    const total = habitat.area;
    if (total === 0) return 0;

    // Count preferred terrain tiles
    let preferredCount = 0;
    for (const t of preferred) {
      preferredCount += habitat.terrainCounts[t] ?? 0;
    }
    const terrainRatio = preferredCount / total;
    let score = Math.min(1, terrainRatio / threshold) * 20;

    // Water check
    if (needsWater) {
      const waterCount = (habitat.terrainCounts[TileType.Water] ?? 0)
                       + (habitat.terrainCounts[TileType.DeepWater] ?? 0);
      const waterRatio = waterCount / total;
      const waterScore = Math.min(1, waterRatio / waterThreshold) * 5;
      score = Math.min(score, 20) + waterScore;
    } else {
      score = Math.min(score + 5, 25);
    }

    return Math.round(Math.min(25, score));
  }

  /** Score 0-20: Does the animal have enough space? */
  private scoreSpace(habitat: Habitat, animal: Animal, neighbors: Animal[]): number {
    const animalCount = neighbors.length + 1;
    const requiredSpace = animal.species.spacePerAnimal * animalCount;
    const ratio = habitat.area / requiredSpace;
    // 1.0 = exact fit (15 pts), 1.5+ = spacious (20 pts), <0.5 = cramped (0-5 pts)
    return Math.round(Math.min(20, ratio * 15));
  }

  /** Score 0-20: Does the habitat have a feeding station? */
  private scoreFood(habitat: Habitat): number {
    const hasFeedingStation = this.hasDecoration(habitat, 'feeding_station');
    return hasFeedingStation ? 20 : 5;
  }

  /** Score 0-20: Does the habitat have required enrichment items? */
  private scoreEnrichment(
    habitat: Habitat,
    enrichmentItems: string[],
    minEnrichment: number,
  ): number {
    let count = 0;
    for (const itemId of enrichmentItems) {
      if (this.hasDecoration(habitat, itemId)) {
        count++;
      }
    }
    if (minEnrichment === 0) return 20;
    const ratio = count / minEnrichment;
    return Math.round(Math.min(20, ratio * 20));
  }

  /** Score 0-15: Are neighbors compatible species? */
  private scoreCompanions(animal: Animal, neighbors: Animal[]): number {
    if (neighbors.length === 0) {
      // Alone — some species are solitary and fine with it
      return animal.species.compatibleWith.length === 0 ? 15 : 8;
    }

    let compatible = 0;
    let incompatible = 0;
    for (const n of neighbors) {
      if (n.species.id === animal.species.id ||
          animal.species.compatibleWith.includes(n.species.id)) {
        compatible++;
      } else {
        incompatible++;
      }
    }

    if (incompatible > 0) {
      // Incompatible neighbors are very bad
      return Math.max(0, 5 - incompatible * 3);
    }
    return Math.min(15, 8 + compatible * 2);
  }

  /** Check if any tile in the habitat has a specific decoration */
  private hasDecoration(habitat: Habitat, decorationId: string): boolean {
    for (const tile of habitat.tiles) {
      const cell = this.tileMap.getCell(tile.x, tile.y);
      if (cell?.decoration?.id === decorationId) return true;
    }
    return false;
  }
}
