/** Animal purchase prices by species ID */
export const ANIMAL_PRICES: Record<string, number> = {
  komodo_dragon: 800,
  saltwater_croc: 1000,
  green_iguana: 400,
  chameleon: 300,
  galapagos_tortoise: 600,
  poison_dart_frog: 200,
  leopard_gecko: 250,
  axolotl: 350,
};

/** Upkeep costs per minute */
export const UPKEEP_COSTS = {
  animalPerMinute: 2,
  facilityPerMinute: 1,
};

/** Admission price tiers based on zoo rating */
export const ADMISSION_TIERS: { rating: number; price: number }[] = [
  { rating: 1, price: 5 },
  { rating: 2, price: 8 },
  { rating: 3, price: 12 },
  { rating: 4, price: 18 },
  { rating: 5, price: 25 },
];
