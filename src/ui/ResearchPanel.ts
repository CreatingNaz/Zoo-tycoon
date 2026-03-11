import { RESEARCH_NODES, BRANCH_INFO, ResearchNode } from '../data/research';
import { ResearchSystem } from '../simulation/ResearchSystem';

const BRANCHES = ['animal_care', 'facilities', 'economy', 'conservation'] as const;

/** Research tree panel — toggled with 'R' key */
export class ResearchPanel {
  private element: HTMLElement;
  private visible = false;
  private researchSystem: ResearchSystem;

  /** Callback when panel opens (for mutual exclusion) */
  onOpen?: () => void;

  constructor(researchSystem: ResearchSystem) {
    this.researchSystem = researchSystem;

    this.element = document.createElement('div');
    this.element.id = 'research-panel';
    this.element.style.cssText = `
      position: fixed;
      right: 16px;
      top: 64px;
      width: 440px;
      max-height: 80vh;
      overflow-y: auto;
      background: rgba(20, 20, 35, 0.95);
      border: 1px solid rgba(100, 200, 255, 0.3);
      border-radius: 8px;
      color: #e0e0e0;
      font-family: monospace;
      font-size: 13px;
      padding: 12px;
      display: none;
      z-index: 90;
      pointer-events: auto;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    `;
    document.body.appendChild(this.element);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        if ((e.target as HTMLElement).tagName === 'INPUT') return;
        this.toggle();
      }
    });
  }

  get isVisible(): boolean { return this.visible; }

  toggle(): void {
    this.visible = !this.visible;
    this.element.style.display = this.visible ? 'block' : 'none';
    if (this.visible) {
      this.onOpen?.();
      this.render();
    }
  }

  hide(): void {
    this.visible = false;
    this.element.style.display = 'none';
  }

  /** Called each frame to refresh if visible */
  refresh(): void {
    if (this.visible) this.render();
  }

  private render(): void {
    this.element.textContent = '';

    // Header
    const header = this.div('display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;');
    const title = this.el('div', 'Research Tree', 'font-size:14px; font-weight:bold; color:#64ffda;');
    const closeBtn = this.el('button', 'x', `
      background:none; border:none; color:#888; cursor:pointer;
      font-size:18px; padding:0 4px; line-height:1;
    `);
    closeBtn.addEventListener('click', () => this.toggle());
    header.append(title, closeBtn);
    this.element.appendChild(header);

    // Active research progress
    const active = this.researchSystem.getActiveResearch();
    if (active) {
      const node = RESEARCH_NODES[active.nodeId];
      const progress = 1 - (active.remaining / active.total);
      const seconds = Math.ceil(active.remaining / 1000);

      const progressBar = this.div('margin-bottom:12px; padding:8px; background:rgba(255,255,255,0.05); border-radius:6px;');
      progressBar.appendChild(this.el('div', `Researching: ${node.name}`, 'font-size:12px; color:#ffc107; margin-bottom:4px;'));
      progressBar.appendChild(this.el('div', `${seconds}s remaining`, 'font-size:11px; color:#aaa; margin-bottom:4px;'));

      const barOuter = this.div('height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;');
      const barInner = this.div(`height:100%; width:${Math.round(progress * 100)}%; background:#ffc107; border-radius:3px; transition:width 0.3s;`);
      barOuter.appendChild(barInner);
      progressBar.appendChild(barOuter);
      this.element.appendChild(progressBar);
    }

    // Branch columns
    const grid = this.div('display:grid; grid-template-columns:repeat(4, 1fr); gap:8px;');

    for (const branch of BRANCHES) {
      const info = BRANCH_INFO[branch];
      const col = this.div('');

      // Branch header
      const branchHeader = this.el('div', info.name, `
        font-size:11px; font-weight:bold; color:${info.color};
        text-align:center; padding:4px; margin-bottom:6px;
        border-bottom:1px solid ${info.color}40;
      `);
      col.appendChild(branchHeader);

      // Get nodes for this branch, sorted by tier
      const nodes = Object.values(RESEARCH_NODES)
        .filter(n => n.branch === branch)
        .sort((a, b) => a.tier - b.tier);

      for (const node of nodes) {
        col.appendChild(this.renderNode(node, active));
      }

      grid.appendChild(col);
    }

    this.element.appendChild(grid);
  }

  private renderNode(
    node: ResearchNode,
    active: { nodeId: string; remaining: number; total: number } | null,
  ): HTMLElement {
    const isCompleted = this.researchSystem.isCompleted(node.id);
    const isActive = active?.nodeId === node.id;
    const isAvailable = this.researchSystem.isAvailable(node.id);
    const canAfford = this.researchSystem.canResearch(node.id);

    let borderColor: string;
    let bgColor: string;
    let textColor: string;

    if (isCompleted) {
      borderColor = '#4caf50';
      bgColor = 'rgba(76, 175, 80, 0.15)';
      textColor = '#4caf50';
    } else if (isActive) {
      borderColor = '#ffc107';
      bgColor = 'rgba(255, 193, 7, 0.12)';
      textColor = '#ffc107';
    } else if (isAvailable) {
      borderColor = '#2196f3';
      bgColor = 'rgba(33, 150, 243, 0.10)';
      textColor = '#e0e0e0';
    } else {
      borderColor = '#444';
      bgColor = 'rgba(255, 255, 255, 0.03)';
      textColor = '#666';
    }

    const card = this.div(`
      border: 1px solid ${borderColor};
      background: ${bgColor};
      border-radius: 5px;
      padding: 6px;
      margin-bottom: 6px;
      cursor: ${canAfford && !active ? 'pointer' : 'default'};
    `);

    // Name
    card.appendChild(this.el('div', node.name, `font-size:11px; font-weight:bold; color:${textColor}; margin-bottom:2px;`));

    // Cost
    const costColor = isCompleted ? '#4caf50' : (canAfford ? '#64ffda' : '#f44336');
    const costText = isCompleted ? 'Done' : `$${node.cost.toLocaleString()}`;
    card.appendChild(this.el('div', costText, `font-size:10px; color:${costColor};`));

    // Description (tooltip-like, compact)
    card.appendChild(this.el('div', node.description, 'font-size:9px; color:#888; margin-top:2px; line-height:1.3;'));

    // Click handler
    if (canAfford && !active) {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        this.researchSystem.startResearch(node.id);
        this.render();
      });
    }

    return card;
  }

  private div(style: string): HTMLElement {
    const el = document.createElement('div');
    el.style.cssText = style;
    return el;
  }

  private el(tag: string, text: string, style?: string): HTMLElement {
    const el = document.createElement(tag);
    el.textContent = text;
    if (style) el.style.cssText = style;
    return el;
  }
}
