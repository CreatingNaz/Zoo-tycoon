/** Staff role definitions */
export interface StaffRole {
  id: string;
  name: string;
  description: string;
  color: number;
  salary: number;     // Cost per minute
  hireCost: number;   // One-time hiring cost
  speed: number;      // Tile movement speed
  taskDuration: number; // ms spent working at a location
}

export const STAFF_ROLES: Record<string, StaffRole> = {
  zookeeper: {
    id: 'zookeeper',
    name: 'Zookeeper',
    description: 'Feeds animals and maintains habitats. Boosts animal happiness.',
    color: 0x4caf50,
    salary: 3,
    hireCost: 500,
    speed: 2.0,
    taskDuration: 5000,
  },
  vet: {
    id: 'vet',
    name: 'Veterinarian',
    description: 'Cares for animal health. Provides a happiness bonus to visited habitats.',
    color: 0x2196f3,
    salary: 5,
    hireCost: 800,
    speed: 2.2,
    taskDuration: 6000,
  },
  janitor: {
    id: 'janitor',
    name: 'Janitor',
    description: 'Cleans paths and facilities. Boosts visitor satisfaction and zoo rating.',
    color: 0xff9800,
    salary: 2,
    hireCost: 300,
    speed: 2.5,
    taskDuration: 3000,
  },
  guide: {
    id: 'guide',
    name: 'Tour Guide',
    description: 'Leads visitors around the zoo. Increases visitor spending.',
    color: 0x9c27b0,
    salary: 3,
    hireCost: 400,
    speed: 1.8,
    taskDuration: 4000,
  },
};
