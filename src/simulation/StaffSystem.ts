import { Staff, StaffState } from '../entities/Staff';
import { StaffRole, STAFF_ROLES } from '../data/staff';
import { EconomySystem } from './EconomySystem';
import { TileMap } from '../world/TileMap';
import { Habitat } from '../world/Habitat';

/** Manages staff hiring, AI task assignment, and effects */
export class StaffSystem {
  private tileMap: TileMap;
  private economySystem: EconomySystem;

  /** All hired staff */
  staff: Staff[] = [];

  /** Task assignment timer (check every 3s) */
  private assignTimer = 0;
  private readonly assignInterval = 3000;

  constructor(tileMap: TileMap, economySystem: EconomySystem) {
    this.tileMap = tileMap;
    this.economySystem = economySystem;
  }

  /** Hire a new staff member at the given tile */
  hire(roleId: string, tileX: number, tileY: number): Staff | null {
    const role = STAFF_ROLES[roleId];
    if (!role) return null;
    if (!this.economySystem.spend(role.hireCost, `Hire ${role.name}`)) return null;

    const member = new Staff(role, tileX, tileY);
    this.staff.push(member);
    return member;
  }

  /** Fire a staff member */
  fire(staff: Staff): void {
    const idx = this.staff.indexOf(staff);
    if (idx >= 0) this.staff.splice(idx, 1);
  }

  /** Get staff salary cost per minute (total for all staff) */
  getTotalSalaryPerMinute(): number {
    return this.staff.reduce((sum, s) => sum + s.role.salary, 0);
  }

  /** Get staff counts by role */
  getCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const role of Object.keys(STAFF_ROLES)) {
      counts[role] = 0;
    }
    for (const s of this.staff) {
      counts[s.role.id] = (counts[s.role.id] ?? 0) + 1;
    }
    return counts;
  }

  /** Called every 10s alongside upkeep — deducts staff salaries */
  tickSalaries(): void {
    // Scale per-minute salaries to 10-second intervals (1/6 of a minute)
    const total = Math.round(this.getTotalSalaryPerMinute() / 6);
    if (total > 0) {
      this.economySystem.spend(total, 'Staff Salaries');
    }
  }

  /** Main update tick — updates staff entities and assigns tasks */
  update(deltaMs: number, habitats: Habitat[]): void {
    // Update all staff entities
    for (const s of this.staff) {
      s.update(deltaMs);
    }

    // Periodically assign tasks to idle staff
    this.assignTimer += deltaMs;
    if (this.assignTimer >= this.assignInterval) {
      this.assignTimer = 0;
      this.assignTasks(habitats);
    }
  }

  /** Get the happiness bonus from zookeepers/vets currently working */
  getStaffHappinessBonus(): number {
    let bonus = 0;
    for (const s of this.staff) {
      if (s.role.id === 'zookeeper') bonus += 0.03;
      if (s.role.id === 'vet') bonus += 0.05;
    }
    return bonus;
  }

  /** Get the rating bonus from janitors */
  getCleanlinessBonus(): number {
    const janitors = this.staff.filter(s => s.role.id === 'janitor').length;
    return Math.min(0.5, janitors * 0.1);
  }

  /** Get visitor spending multiplier from guides */
  getGuideSpendingMultiplier(): number {
    const guides = this.staff.filter(s => s.role.id === 'guide').length;
    return 1.0 + Math.min(0.5, guides * 0.1);
  }

  /** Assign tasks to idle staff members */
  private assignTasks(habitats: Habitat[]): void {
    for (const s of this.staff) {
      if (!s.isAvailable()) continue;

      switch (s.role.id) {
        case 'zookeeper':
        case 'vet':
          this.assignHabitatTask(s, habitats);
          break;
        case 'janitor':
        case 'guide':
          this.assignWanderTask(s);
          break;
      }
    }
  }

  /** Send a zookeeper/vet to an unserviced habitat */
  private assignHabitatTask(staff: Staff, habitats: Habitat[]): void {
    // Find nearest habitat not recently serviced
    let bestHabitat: Habitat | null = null;
    let bestDist = Infinity;

    for (const h of habitats) {
      if (staff.hasRecentlyServiced(h.id)) continue;
      if (h.tiles.length === 0) continue;

      // Use first tile of habitat as target
      const tx = h.tiles[0].x;
      const ty = h.tiles[0].y;
      const dx = tx - staff.tileX;
      const dy = ty - staff.tileY;
      const dist = Math.abs(dx) + Math.abs(dy);

      if (dist < bestDist) {
        bestDist = dist;
        bestHabitat = h;
      }
    }

    if (bestHabitat) {
      // Walk toward habitat, then work
      const target = bestHabitat.tiles[0];
      const path = this.findPathNear(
        Math.floor(staff.tileX), Math.floor(staff.tileY),
        target.x, target.y,
      );
      if (path.length > 0) {
        staff.setPath(path);
        staff.markServiced(bestHabitat.id);
      } else {
        // Can't pathfind — just wander
        this.assignWanderTask(staff);
      }
    } else {
      // No habitats to service — wander
      this.assignWanderTask(staff);
    }
  }

  /** Send a janitor/guide on a random wander path */
  private assignWanderTask(staff: Staff): void {
    const path = this.findWanderPath(
      Math.floor(staff.tileX), Math.floor(staff.tileY), 12,
    );
    if (path.length > 0) {
      staff.setPath(path);
    }
  }

  /** Find a walkable path near a target (BFS on paths, stop near target) */
  private findPathNear(
    fromX: number, fromY: number, toX: number, toY: number,
  ): { x: number; y: number }[] {
    const visited = new Set<string>();
    const parent = new Map<string, string>();
    const queue: { x: number; y: number }[] = [{ x: fromX, y: fromY }];
    const startKey = `${fromX},${fromY}`;
    visited.add(startKey);

    // We want to get adjacent to the target (within 2 tiles)
    let bestKey: string | null = null;
    let bestDist = Infinity;

    while (queue.length > 0) {
      const current = queue.shift()!;
      const curKey = `${current.x},${current.y}`;

      const dx = current.x - toX;
      const dy = current.y - toY;
      const dist = Math.abs(dx) + Math.abs(dy);
      if (dist < bestDist) {
        bestDist = dist;
        bestKey = curKey;
      }
      if (dist <= 2) break; // Close enough

      for (const [ddx, ddy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const nx = current.x + ddx;
        const ny = current.y + ddy;
        const nk = `${nx},${ny}`;
        if (visited.has(nk)) continue;
        // Staff can walk on paths and any non-water, non-fence terrain
        const type = this.tileMap.getType(nx, ny);
        if (!TileMap.isPath(type) && !this.isWalkable(nx, ny)) continue;
        visited.add(nk);
        parent.set(nk, curKey);
        queue.push({ x: nx, y: ny });
      }
    }

    if (!bestKey || bestKey === startKey) return [];

    // Reconstruct
    const path: { x: number; y: number }[] = [];
    let key = bestKey;
    while (key !== startKey) {
      const [px, py] = key.split(',').map(Number);
      path.unshift({ x: px, y: py });
      const p = parent.get(key);
      if (!p) break;
      key = p;
    }
    return path;
  }

  /** Check if a tile is walkable (non-water, non-deep-water) */
  private isWalkable(x: number, y: number): boolean {
    if (!this.tileMap.getCell(x, y)) return false;
    return TileMap.isPath(this.tileMap.getType(x, y));
  }

  /** Random wander on path tiles */
  private findWanderPath(
    fromX: number, fromY: number, maxSteps: number,
  ): { x: number; y: number }[] {
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
      if (neighbors.length === 0) break;

      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      path.push(next);
      visited.add(`${next.x},${next.y}`);
      cx = next.x;
      cy = next.y;
    }

    return path;
  }
}
