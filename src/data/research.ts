/** Research effect types */
export type ResearchEffect =
  | { type: 'happiness_bonus'; value: number }
  | { type: 'cost_reduction'; category: string; value: number }
  | { type: 'upkeep_reduction'; value: number }
  | { type: 'admission_bonus'; value: number }
  | { type: 'visitor_capacity'; value: number }
  | { type: 'unlock_species'; speciesId: string }
  | { type: 'unlock_building'; buildingId: string }
  | { type: 'rating_bonus'; value: number };

export interface ResearchNode {
  id: string;
  name: string;
  description: string;
  branch: 'animal_care' | 'facilities' | 'economy' | 'conservation';
  tier: number;
  cost: number;
  researchTime: number; // milliseconds
  prerequisites: string[];
  effect: ResearchEffect;
}

/** All research nodes organized by branch and tier */
export const RESEARCH_NODES: Record<string, ResearchNode> = {
  // === Animal Care Branch ===
  basic_enrichment: {
    id: 'basic_enrichment',
    name: 'Basic Enrichment',
    description: 'Improved enrichment techniques boost animal happiness.',
    branch: 'animal_care',
    tier: 1,
    cost: 500,
    researchTime: 30000,
    prerequisites: [],
    effect: { type: 'happiness_bonus', value: 0.10 },
  },
  advanced_habitats: {
    id: 'advanced_habitats',
    name: 'Advanced Habitats',
    description: 'Optimized habitat layouts significantly improve animal wellbeing.',
    branch: 'animal_care',
    tier: 2,
    cost: 1500,
    researchTime: 60000,
    prerequisites: ['basic_enrichment'],
    effect: { type: 'happiness_bonus', value: 0.20 },
  },
  veterinary_care: {
    id: 'veterinary_care',
    name: 'Veterinary Care',
    description: 'Professional vet services keep animals in peak condition.',
    branch: 'animal_care',
    tier: 3,
    cost: 3000,
    researchTime: 90000,
    prerequisites: ['advanced_habitats'],
    effect: { type: 'happiness_bonus', value: 0.15 },
  },
  breeding_program: {
    id: 'breeding_program',
    name: 'Breeding Program',
    description: 'Unlock rare reptile species through captive breeding.',
    branch: 'animal_care',
    tier: 4,
    cost: 5000,
    researchTime: 120000,
    prerequisites: ['veterinary_care'],
    effect: { type: 'unlock_species', speciesId: 'king_cobra' },
  },

  // === Facilities Branch ===
  better_paths: {
    id: 'better_paths',
    name: 'Better Paths',
    description: 'Improved path materials reduce construction costs.',
    branch: 'facilities',
    tier: 1,
    cost: 600,
    researchTime: 30000,
    prerequisites: [],
    effect: { type: 'cost_reduction', category: 'paths', value: 0.20 },
  },
  visitor_center: {
    id: 'visitor_center',
    name: 'Visitor Center',
    description: 'A central hub increases maximum visitor capacity.',
    branch: 'facilities',
    tier: 2,
    cost: 1500,
    researchTime: 60000,
    prerequisites: ['better_paths'],
    effect: { type: 'visitor_capacity', value: 10 },
  },
  premium_facilities: {
    id: 'premium_facilities',
    name: 'Premium Facilities',
    description: 'Upgraded food stalls and gift shops at lower cost.',
    branch: 'facilities',
    tier: 3,
    cost: 2500,
    researchTime: 90000,
    prerequisites: ['visitor_center'],
    effect: { type: 'cost_reduction', category: 'facilities', value: 0.25 },
  },
  amphitheater: {
    id: 'amphitheater',
    name: 'Amphitheater',
    description: 'Unlock amphitheater building for animal shows.',
    branch: 'facilities',
    tier: 4,
    cost: 4500,
    researchTime: 120000,
    prerequisites: ['premium_facilities'],
    effect: { type: 'unlock_building', buildingId: 'amphitheater' },
  },

  // === Economy Branch ===
  marketing_campaign: {
    id: 'marketing_campaign',
    name: 'Marketing Campaign',
    description: 'Advertising drives up admission prices.',
    branch: 'economy',
    tier: 1,
    cost: 800,
    researchTime: 30000,
    prerequisites: [],
    effect: { type: 'admission_bonus', value: 0.20 },
  },
  cost_optimization: {
    id: 'cost_optimization',
    name: 'Cost Optimization',
    description: 'Streamlined operations reduce upkeep costs.',
    branch: 'economy',
    tier: 2,
    cost: 2000,
    researchTime: 60000,
    prerequisites: ['marketing_campaign'],
    effect: { type: 'upkeep_reduction', value: 0.15 },
  },
  sponsorship_deals: {
    id: 'sponsorship_deals',
    name: 'Sponsorship Deals',
    description: 'Corporate sponsors further boost admission revenue.',
    branch: 'economy',
    tier: 3,
    cost: 3500,
    researchTime: 90000,
    prerequisites: ['cost_optimization'],
    effect: { type: 'admission_bonus', value: 0.15 },
  },
  global_brand: {
    id: 'global_brand',
    name: 'Global Brand',
    description: 'International recognition brings massive visitor capacity.',
    branch: 'economy',
    tier: 4,
    cost: 6000,
    researchTime: 120000,
    prerequisites: ['sponsorship_deals'],
    effect: { type: 'visitor_capacity', value: 25 },
  },

  // === Conservation Branch ===
  education_programs: {
    id: 'education_programs',
    name: 'Education Programs',
    description: 'Educational exhibits boost your zoo rating.',
    branch: 'conservation',
    tier: 1,
    cost: 700,
    researchTime: 30000,
    prerequisites: [],
    effect: { type: 'rating_bonus', value: 0.3 },
  },
  endangered_species: {
    id: 'endangered_species',
    name: 'Endangered Species',
    description: 'Partner with conservation groups to exhibit rare animals.',
    branch: 'conservation',
    tier: 2,
    cost: 2500,
    researchTime: 90000,
    prerequisites: ['education_programs'],
    effect: { type: 'unlock_species', speciesId: 'sea_turtle' },
  },
  habitat_restoration: {
    id: 'habitat_restoration',
    name: 'Habitat Restoration',
    description: 'Restore natural habitats, reducing upkeep costs.',
    branch: 'conservation',
    tier: 3,
    cost: 3000,
    researchTime: 90000,
    prerequisites: ['endangered_species'],
    effect: { type: 'upkeep_reduction', value: 0.10 },
  },
  wildlife_sanctuary: {
    id: 'wildlife_sanctuary',
    name: 'Wildlife Sanctuary',
    description: 'Establish a sanctuary for a major zoo rating boost.',
    branch: 'conservation',
    tier: 4,
    cost: 5500,
    researchTime: 120000,
    prerequisites: ['habitat_restoration'],
    effect: { type: 'rating_bonus', value: 0.5 },
  },
};

/** Branch display names and colors */
export const BRANCH_INFO: Record<string, { name: string; color: string }> = {
  animal_care: { name: 'Animal Care', color: '#4caf50' },
  facilities: { name: 'Facilities', color: '#2196f3' },
  economy: { name: 'Economy', color: '#ff9800' },
  conservation: { name: 'Conservation', color: '#9c27b0' },
};
