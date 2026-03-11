import { TileType } from '../world/TileMap';

/** Habitat type identifiers */
export type HabitatType =
  | 'desert_terrarium'
  | 'tropical_vivarium'
  | 'swamp'
  | 'large_aquarium'
  | 'reef_tank'
  | 'rainforest_vivarium'
  | 'freshwater'
  | 'insectarium'
  | 'arachnid_terrarium'
  | 'deep_sea_tank';

/** Food categories */
export type FoodType = 'meat' | 'fish' | 'insects' | 'plants' | 'plankton' | 'omnivore';

/** What a habitat type requires */
export interface HabitatRequirements {
  id: HabitatType;
  name: string;
  /** Terrain tiles that should make up the majority of the habitat */
  preferredTerrain: TileType[];
  /** Minimum percentage of preferred terrain (0-1) */
  terrainThreshold: number;
  /** Minimum habitat area in tiles */
  minArea: number;
  /** Decorations that count as enrichment */
  enrichmentItems: string[];
  /** Minimum enrichment items for full happiness */
  minEnrichment: number;
  /** Does this habitat need water tiles? */
  needsWater: boolean;
  /** Minimum water tile percentage if needed (0-1) */
  waterThreshold: number;
}

/** All habitat type definitions */
export const HABITAT_TYPES: Record<HabitatType, HabitatRequirements> = {
  desert_terrarium: {
    id: 'desert_terrarium',
    name: 'Desert Terrarium',
    preferredTerrain: [TileType.Sand, TileType.Rock, TileType.Dirt],
    terrainThreshold: 0.5,
    minArea: 12,
    enrichmentItems: ['heat_lamp', 'rock_decor', 'shelter'],
    minEnrichment: 2,
    needsWater: false,
    waterThreshold: 0,
  },
  tropical_vivarium: {
    id: 'tropical_vivarium',
    name: 'Tropical Vivarium',
    preferredTerrain: [TileType.Grass, TileType.Dirt],
    terrainThreshold: 0.4,
    minArea: 16,
    enrichmentItems: ['tree_tropical', 'bush', 'heat_lamp', 'water_dish'],
    minEnrichment: 3,
    needsWater: true,
    waterThreshold: 0.1,
  },
  swamp: {
    id: 'swamp',
    name: 'Swamp',
    preferredTerrain: [TileType.Grass, TileType.Dirt, TileType.Water],
    terrainThreshold: 0.3,
    minArea: 20,
    enrichmentItems: ['bush', 'rock_decor', 'shelter'],
    minEnrichment: 2,
    needsWater: true,
    waterThreshold: 0.3,
  },
  large_aquarium: {
    id: 'large_aquarium',
    name: 'Large Aquarium',
    preferredTerrain: [TileType.Water, TileType.DeepWater],
    terrainThreshold: 0.8,
    minArea: 24,
    enrichmentItems: ['rock_decor', 'enrichment', 'feeding_station'],
    minEnrichment: 2,
    needsWater: true,
    waterThreshold: 0.8,
  },
  reef_tank: {
    id: 'reef_tank',
    name: 'Reef Tank',
    preferredTerrain: [TileType.Water, TileType.Sand],
    terrainThreshold: 0.7,
    minArea: 16,
    enrichmentItems: ['rock_decor', 'enrichment', 'flower_bed'],
    minEnrichment: 3,
    needsWater: true,
    waterThreshold: 0.6,
  },
  rainforest_vivarium: {
    id: 'rainforest_vivarium',
    name: 'Rainforest Vivarium',
    preferredTerrain: [TileType.Grass, TileType.Dirt],
    terrainThreshold: 0.5,
    minArea: 12,
    enrichmentItems: ['tree_tropical', 'bush', 'water_dish', 'flower_bed'],
    minEnrichment: 3,
    needsWater: true,
    waterThreshold: 0.15,
  },
  freshwater: {
    id: 'freshwater',
    name: 'Freshwater Habitat',
    preferredTerrain: [TileType.Water, TileType.Grass],
    terrainThreshold: 0.5,
    minArea: 12,
    enrichmentItems: ['rock_decor', 'bush', 'enrichment'],
    minEnrichment: 2,
    needsWater: true,
    waterThreshold: 0.4,
  },
  insectarium: {
    id: 'insectarium',
    name: 'Insectarium',
    preferredTerrain: [TileType.Grass, TileType.Dirt],
    terrainThreshold: 0.5,
    minArea: 6,
    enrichmentItems: ['bush', 'tree_tropical', 'flower_bed'],
    minEnrichment: 2,
    needsWater: false,
    waterThreshold: 0,
  },
  arachnid_terrarium: {
    id: 'arachnid_terrarium',
    name: 'Arachnid Terrarium',
    preferredTerrain: [TileType.Sand, TileType.Dirt, TileType.Rock],
    terrainThreshold: 0.5,
    minArea: 6,
    enrichmentItems: ['rock_decor', 'shelter', 'bush'],
    minEnrichment: 1,
    needsWater: false,
    waterThreshold: 0,
  },
  deep_sea_tank: {
    id: 'deep_sea_tank',
    name: 'Deep Sea Tank',
    preferredTerrain: [TileType.DeepWater],
    terrainThreshold: 0.7,
    minArea: 20,
    enrichmentItems: ['rock_decor', 'enrichment', 'feeding_station'],
    minEnrichment: 2,
    needsWater: true,
    waterThreshold: 0.9,
  },
};
