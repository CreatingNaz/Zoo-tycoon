import { RESEARCH_NODES, ResearchNode, ResearchEffect } from '../data/research';
import { EconomySystem } from './EconomySystem';

/** Manages research state, progress, and effect aggregation */
export class ResearchSystem {
  private completed = new Set<string>();
  private activeResearch: { nodeId: string; remaining: number } | null = null;
  private economySystem: EconomySystem;

  /** Fired when a research completes */
  onComplete?: (node: ResearchNode) => void;

  constructor(economySystem: EconomySystem) {
    this.economySystem = economySystem;
  }

  /** Check if a node's research is completed */
  isCompleted(nodeId: string): boolean {
    return this.completed.has(nodeId);
  }

  /** Check if a node can be researched (prereqs met, affordable, not active/done) */
  canResearch(nodeId: string): boolean {
    if (this.completed.has(nodeId)) return false;
    if (this.activeResearch?.nodeId === nodeId) return false;

    const node = RESEARCH_NODES[nodeId];
    if (!node) return false;

    // Check prerequisites
    for (const prereq of node.prerequisites) {
      if (!this.completed.has(prereq)) return false;
    }

    return this.economySystem.canAfford(node.cost);
  }

  /** Whether prerequisites are met (regardless of affordability) */
  isAvailable(nodeId: string): boolean {
    if (this.completed.has(nodeId)) return false;
    const node = RESEARCH_NODES[nodeId];
    if (!node) return false;
    for (const prereq of node.prerequisites) {
      if (!this.completed.has(prereq)) return false;
    }
    return true;
  }

  /** Start researching a node */
  startResearch(nodeId: string): boolean {
    if (!this.canResearch(nodeId)) return false;
    if (this.activeResearch) return false; // already researching something

    const node = RESEARCH_NODES[nodeId];
    if (!this.economySystem.spend(node.cost, `Research: ${node.name}`)) return false;

    this.activeResearch = { nodeId, remaining: node.researchTime };
    return true;
  }

  /** Tick the active research timer */
  update(deltaMs: number): void {
    if (!this.activeResearch) return;

    this.activeResearch.remaining -= deltaMs;
    if (this.activeResearch.remaining <= 0) {
      const nodeId = this.activeResearch.nodeId;
      this.completed.add(nodeId);
      this.activeResearch = null;
      this.onComplete?.(RESEARCH_NODES[nodeId]);
    }
  }

  /** Get the currently active research (if any) */
  getActiveResearch(): { nodeId: string; remaining: number; total: number } | null {
    if (!this.activeResearch) return null;
    const node = RESEARCH_NODES[this.activeResearch.nodeId];
    return {
      nodeId: this.activeResearch.nodeId,
      remaining: this.activeResearch.remaining,
      total: node.researchTime,
    };
  }

  /** Aggregate a specific effect type across all completed research */
  getEffect(type: ResearchEffect['type']): number {
    let total = 0;
    for (const nodeId of this.completed) {
      const node = RESEARCH_NODES[nodeId];
      if (node.effect.type === type && 'value' in node.effect) {
        total += (node.effect as { type: string; value: number }).value;
      }
    }
    return total;
  }

  /** Get total happiness multiplier (1.0 + sum of happiness bonuses) */
  getHappinessMultiplier(): number {
    return 1.0 + this.getEffect('happiness_bonus');
  }

  /** Get total upkeep multiplier (1.0 - sum of reductions, min 0.5) */
  getUpkeepMultiplier(): number {
    return Math.max(0.5, 1.0 - this.getEffect('upkeep_reduction'));
  }

  /** Get total admission multiplier (1.0 + sum of bonuses) */
  getAdmissionMultiplier(): number {
    return 1.0 + this.getEffect('admission_bonus');
  }

  /** Get bonus visitor capacity from research */
  getVisitorCapacityBonus(): number {
    return this.getEffect('visitor_capacity');
  }

  /** Get total rating bonus from research */
  getRatingBonus(): number {
    return this.getEffect('rating_bonus');
  }

  /** Get list of completed research IDs */
  getCompletedIds(): string[] {
    return [...this.completed];
  }
}
