import { Visitor, VisitorState } from '../entities/Visitor';
import { TileMap, TileType } from '../world/TileMap';
import { Habitat } from '../world/Habitat';
import { Animal } from '../entities/Animal';

/** Facility decoration IDs that visitors interact with */
const FACILITY_IDS: Record<string, 'food_stall' | 'gift_shop' | 'restroom' | 'info_booth'> = {
  food_stall: 'food_stall',
  gift_shop: 'gift_shop',
  restroom: 'restroom',
  info_booth: 'info_booth',
};

/** Manages visitor spawning, pathfinding, and behavior */
export class VisitorSystem {
  private tileMap: TileMap;
  private spawnTimer = 0;
  private entrances: { x: number; y: number }[] = [];

  /** Dynamic admission price set by EconomySystem */
  admissionPrice = 5;

  constructor(tileMap: TileMap) {
    this.tileMap = tileMap;
    this.findEntrances();
  }

  /** Find path tiles on the map edges to use as entrance/exit */
  findEntrances(): void {
    this.entrances = [];
    const w = this.tileMap.width;
    const h = this.tileMap.height;

    // Check all edges for path tiles
    for (let x = 0; x < w; x++) {
      if (TileMap.isPath(this.tileMap.getType(x, 0))) this.entrances.push({ x, y: 0 });
      if (TileMap.isPath(this.tileMap.getType(x, h - 1))) this.entrances.push({ x, y: h - 1 });
    }
    for (let y = 0; y < h; y++) {
      if (TileMap.isPath(this.tileMap.getType(0, y))) this.entrances.push({ x: 0, y });
      if (TileMap.isPath(this.tileMap.getType(w - 1, y))) this.entrances.push({ x: w - 1, y });
    }

    // Fallback: find the southernmost path tile near edges
    if (this.entrances.length === 0) {
      const cx = Math.floor(w / 2);
      // Walk south from center to find edge-adjacent path
      for (let y = h - 1; y >= 0; y--) {
        if (TileMap.isPath(this.tileMap.getType(cx, y))) {
          this.entrances.push({ x: cx, y });
          break;
        }
      }
    }
  }

  /** Calculate spawn interval based on zoo rating (ms between spawns) */
  private getSpawnInterval(zooRating: number): number {
    // Rating 1 -> 5000ms, Rating 5 -> 1000ms
    return Math.max(1000, 5000 - (zooRating - 1) * 1000);
  }

  /** Calculate zoo rating (1-5 stars) */
  calculateZooRating(animals: Animal[], habitats: Habitat[]): number {
    if (animals.length === 0) return 1;

    // Factor 1: Average animal happiness (0-100 -> 0-2 stars)
    const avgHappiness = animals.reduce((sum, a) => sum + a.happiness, 0) / animals.length;
    const happinessScore = (avgHappiness / 100) * 2;

    // Factor 2: Facility coverage (0-1.5 stars based on facility count)
    const facilityCount = this.countFacilities();
    const facilityScore = Math.min(1.5, facilityCount * 0.3);

    // Factor 3: Path connectivity / habitat count (0-1.5 stars)
    const habitatScore = Math.min(1.5, habitats.length * 0.3);

    return Math.max(1, Math.min(5, happinessScore + facilityScore + habitatScore));
  }

  /** Count placed facilities */
  countFacilities(): number {
    let count = 0;
    for (let y = 0; y < this.tileMap.height; y++) {
      for (let x = 0; x < this.tileMap.width; x++) {
        const cell = this.tileMap.getCell(x, y);
        if (cell?.decoration && cell.decoration.id in FACILITY_IDS) {
          count++;
        }
      }
    }
    return count;
  }

  /** Main update tick */
  update(
    deltaMs: number,
    visitors: Visitor[],
    animals: Animal[],
    habitats: Habitat[],
    zooRating: number,
    maxVisitors = 50,
  ): { spawned: Visitor[]; despawned: Visitor[]; income: number } {
    const result = { spawned: [] as Visitor[], despawned: [] as Visitor[], income: 0 };

    // Spawn visitors
    this.spawnTimer += deltaMs;
    const interval = this.getSpawnInterval(zooRating);
    if (this.spawnTimer >= interval && visitors.length < maxVisitors && this.entrances.length > 0) {
      this.spawnTimer = 0;
      const entrance = this.entrances[Math.floor(Math.random() * this.entrances.length)];
      const visitor = new Visitor(entrance.x + 0.5, entrance.y + 0.5);
      visitor.spawnX = entrance.x;
      visitor.spawnY = entrance.y;

      // Admission fee
      const admission = this.admissionPrice;
      visitor.money -= admission;
      visitor.moneySpent += admission;
      result.income += admission;

      // Give them a path to follow
      const path = this.findWanderPath(entrance.x, entrance.y, 20);
      visitor.setPath(path);

      result.spawned.push(visitor);
    }

    // Update each visitor
    for (const visitor of visitors) {
      visitor.update(deltaMs);

      // Check if it's time to leave
      if (!visitor.isLeaving && visitor.totalTime >= visitor.lifetime) {
        this.startVisitorLeaving(visitor);
      }

      // Check if they've finished their path and need a new one
      if (!visitor.isStopped() && visitor.hasReachedPathEnd()) {
        if (visitor.isLeaving) {
          result.despawned.push(visitor);
          continue;
        }
        // Give them a new wander path
        const tx = Math.floor(visitor.tileX);
        const ty = Math.floor(visitor.tileY);
        const path = this.findWanderPath(tx, ty, 15);
        if (path.length > 0) {
          visitor.setPath(path);
        } else {
          // No paths available, leave
          this.startVisitorLeaving(visitor);
        }
      }

      // Interaction checks (only when walking and at a tile center)
      if (visitor.state === VisitorState.Walking && !visitor.isLeaving) {
        const vx = Math.floor(visitor.tileX);
        const vy = Math.floor(visitor.tileY);

        // Check adjacent tiles for habitats
        this.checkHabitatViewing(visitor, vx, vy, habitats, animals);

        // Check current tile for facilities
        const income = this.checkFacilityVisit(visitor, vx, vy);
        if (income > 0) {
          result.income += income;
        }
      }
    }

    return result;
  }

  /** Check if visitor is adjacent to a habitat and should view it */
  private checkHabitatViewing(
    visitor: Visitor, vx: number, vy: number,
    habitats: Habitat[], animals: Animal[],
  ): void {
    const neighbors = [
      { x: vx - 1, y: vy }, { x: vx + 1, y: vy },
      { x: vx, y: vy - 1 }, { x: vx, y: vy + 1 },
    ];

    for (const n of neighbors) {
      const cell = this.tileMap.getCell(n.x, n.y);
      if (!cell || !TileMap.isFence(cell.type)) continue;

      // Find which habitat is on the other side of this fence
      for (const habitat of habitats) {
        if (visitor.viewedHabitats.has(habitat.id)) continue;

        // Check if any habitat tile is adjacent to this fence
        const hasAdjacentTile = habitat.tiles.some(t =>
          Math.abs(t.x - n.x) <= 1 && Math.abs(t.y - n.y) <= 1
        );
        if (!hasAdjacentTile) continue;

        // Get average happiness of animals in this habitat
        const habitatAnimals = animals.filter(a => a.habitatId === habitat.id);
        if (habitatAnimals.length === 0) continue;

        const avgHappiness = habitatAnimals.reduce((s, a) => s + a.happiness, 0) / habitatAnimals.length;
        visitor.startViewing(habitat.id, avgHappiness);
        return;
      }
    }
  }

  /** Check if visitor is on a facility tile */
  private checkFacilityVisit(visitor: Visitor, vx: number, vy: number): number {
    // Check current and adjacent tiles for facilities
    const positions = [
      { x: vx, y: vy },
      { x: vx - 1, y: vy }, { x: vx + 1, y: vy },
      { x: vx, y: vy - 1 }, { x: vx, y: vy + 1 },
    ];

    for (const pos of positions) {
      const cell = this.tileMap.getCell(pos.x, pos.y);
      if (!cell?.decoration) continue;

      const facilityType = FACILITY_IDS[cell.decoration.id];
      if (!facilityType) continue;

      // Random chance to stop (30%)
      if (Math.random() < 0.3) {
        return visitor.visitFacility(facilityType);
      }
    }
    return 0;
  }

  /** Make a visitor head back to their entrance */
  private startVisitorLeaving(visitor: Visitor): void {
    visitor.startLeaving();
    const vx = Math.floor(visitor.tileX);
    const vy = Math.floor(visitor.tileY);
    const exitPath = this.findPathTo(vx, vy, visitor.spawnX, visitor.spawnY);
    if (exitPath.length > 0) {
      visitor.setPath(exitPath);
    } else {
      // Can't find exit, just despawn at nearest edge
      visitor.setPath([{ x: visitor.spawnX, y: visitor.spawnY }]);
    }
  }

  /** BFS to find a path between two points along path tiles */
  private findPathTo(fromX: number, fromY: number, toX: number, toY: number): { x: number; y: number }[] {
    const visited = new Set<string>();
    const parent = new Map<string, string>();
    const queue: { x: number; y: number }[] = [{ x: fromX, y: fromY }];
    const startKey = `${fromX},${fromY}`;
    visited.add(startKey);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.x === toX && current.y === toY) {
        // Reconstruct path
        const path: { x: number; y: number }[] = [];
        let key = `${toX},${toY}`;
        while (key !== startKey) {
          const [px, py] = key.split(',').map(Number);
          path.unshift({ x: px, y: py });
          key = parent.get(key)!;
        }
        return path;
      }

      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const nx = current.x + dx;
        const ny = current.y + dy;
        const nk = `${nx},${ny}`;
        if (visited.has(nk)) continue;
        if (!TileMap.isPath(this.tileMap.getType(nx, ny))) continue;
        visited.add(nk);
        parent.set(nk, `${current.x},${current.y}`);
        queue.push({ x: nx, y: ny });
      }
    }

    return []; // No path found
  }

  /** BFS wander: explore random connected path tiles */
  private findWanderPath(fromX: number, fromY: number, maxSteps: number): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [];
    const visited = new Set<string>();
    let cx = fromX;
    let cy = fromY;
    visited.add(`${cx},${cy}`);

    for (let i = 0; i < maxSteps; i++) {
      const neighbors: { x: number; y: number }[] = [];
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!visited.has(`${nx},${ny}`) && TileMap.isPath(this.tileMap.getType(nx, ny))) {
          neighbors.push({ x: nx, y: ny });
        }
      }

      if (neighbors.length === 0) {
        // Backtrack or stop
        break;
      }

      // Pick a random neighbor
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      path.push(next);
      visited.add(`${next.x},${next.y}`);
      cx = next.x;
      cy = next.y;
    }

    return path;
  }
}
