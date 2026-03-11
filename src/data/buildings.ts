import { TileType } from '../world/TileMap';

/** Categories of buildable items */
export type BuildCategory = 'terrain' | 'paths' | 'fencing' | 'decorations' | 'habitats' | 'facilities' | 'animals';

/** A buildable item definition */
export interface BuildItem {
  id: string;
  label: string;
  category: BuildCategory;
  cost: number;
  /** For terrain/path items, the tile type to place */
  tileType?: TileType;
  /** Display color for the build panel swatch */
  color: number;
  /** Size in tiles (default 1x1) */
  width?: number;
  height?: number;
}

/** All buildable items */
export const BUILD_ITEMS: BuildItem[] = [
  // Terrain
  { id: 'grass', label: 'Grass', category: 'terrain', cost: 5, tileType: TileType.Grass, color: 0x4a7c59 },
  { id: 'dirt', label: 'Dirt', category: 'terrain', cost: 3, tileType: TileType.Dirt, color: 0x8b6914 },
  { id: 'sand', label: 'Sand', category: 'terrain', cost: 8, tileType: TileType.Sand, color: 0xd4a574 },
  { id: 'water', label: 'Water', category: 'terrain', cost: 15, tileType: TileType.Water, color: 0x3d85c6 },
  { id: 'deep_water', label: 'Deep Water', category: 'terrain', cost: 25, tileType: TileType.DeepWater, color: 0x1a5276 },
  { id: 'rock', label: 'Rock', category: 'terrain', cost: 10, tileType: TileType.Rock, color: 0x6b6b6b },

  // Paths
  { id: 'path', label: 'Path', category: 'paths', cost: 10, tileType: TileType.Path, color: 0x8b8b83 },

  // Fencing
  { id: 'fence_wire', label: 'Wire Fence', category: 'fencing', cost: 20, tileType: TileType.FenceWire, color: 0x888888 },
  { id: 'fence_glass', label: 'Glass Wall', category: 'fencing', cost: 50, tileType: TileType.FenceGlass, color: 0x88ccee },
  { id: 'fence_wall', label: 'Stone Wall', category: 'fencing', cost: 35, tileType: TileType.FenceWall, color: 0x666666 },
  { id: 'fence_wooden', label: 'Wooden Fence', category: 'fencing', cost: 15, tileType: TileType.FenceWooden, color: 0x8b6b3a },

  // Decorations
  { id: 'tree_tropical', label: 'Tropical Tree', category: 'decorations', cost: 30, color: 0x2d8b2d },
  { id: 'bush', label: 'Bush', category: 'decorations', cost: 10, color: 0x3a7a3a },
  { id: 'rock_decor', label: 'Rock Pile', category: 'decorations', cost: 15, color: 0x7a7a7a },
  { id: 'flower_bed', label: 'Flower Bed', category: 'decorations', cost: 20, color: 0xe8508a },
  { id: 'bench', label: 'Bench', category: 'decorations', cost: 25, color: 0x6b4a2a },
  { id: 'lamp', label: 'Lamp Post', category: 'decorations', cost: 40, color: 0xd4a800 },
  { id: 'trash_can', label: 'Trash Can', category: 'decorations', cost: 15, color: 0x4a4a4a },
  { id: 'fountain', label: 'Fountain', category: 'decorations', cost: 100, color: 0x5a9acd },

  // Habitat buildings
  { id: 'heat_lamp', label: 'Heat Lamp', category: 'habitats', cost: 50, color: 0xe86830 },
  { id: 'feeding_station', label: 'Feeding Station', category: 'habitats', cost: 40, color: 0xa06830 },
  { id: 'shelter', label: 'Shelter', category: 'habitats', cost: 60, color: 0x7a6a5a },
  { id: 'water_dish', label: 'Water Dish', category: 'habitats', cost: 20, color: 0x4a8ac6 },
  { id: 'enrichment', label: 'Enrichment Toy', category: 'habitats', cost: 35, color: 0xd07030 },

  // Visitor facilities
  { id: 'food_stall', label: 'Food Stall', category: 'facilities', cost: 200, color: 0xE8A040 },
  { id: 'gift_shop', label: 'Gift Shop', category: 'facilities', cost: 300, color: 0xC040C0 },
  { id: 'restroom', label: 'Restroom', category: 'facilities', cost: 150, color: 0x4080C0 },
  { id: 'info_booth', label: 'Info Booth', category: 'facilities', cost: 100, color: 0x40C080 },

  // Animals (purchasable species)
  { id: 'komodo_dragon', label: 'Komodo Dragon', category: 'animals', cost: 800, color: 0x6b5b3a },
  { id: 'saltwater_croc', label: 'Saltwater Croc', category: 'animals', cost: 1000, color: 0x4a6b4a },
  { id: 'green_iguana', label: 'Green Iguana', category: 'animals', cost: 400, color: 0x5a8b3a },
  { id: 'chameleon', label: 'Chameleon', category: 'animals', cost: 300, color: 0x7ab648 },
  { id: 'galapagos_tortoise', label: 'Galapagos Tortoise', category: 'animals', cost: 600, color: 0x5a6b4a },
  { id: 'poison_dart_frog', label: 'Poison Dart Frog', category: 'animals', cost: 200, color: 0x2a7ae8 },
  { id: 'leopard_gecko', label: 'Leopard Gecko', category: 'animals', cost: 250, color: 0xe8c840 },
  { id: 'axolotl', label: 'Axolotl', category: 'animals', cost: 350, color: 0xe898a8 },
];

/** Category display names */
export const CATEGORY_LABELS: Record<BuildCategory, string> = {
  terrain: 'Terrain',
  paths: 'Paths',
  fencing: 'Fencing',
  decorations: 'Decor',
  habitats: 'Habitat',
  facilities: 'Facilities',
  animals: 'Animals',
};
