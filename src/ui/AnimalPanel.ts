import { Animal, HappinessFactors } from '../entities/Animal';
import { HABITAT_TYPES } from '../data/habitats';

/** Clickable animal info panel showing stats and happiness breakdown */
export class AnimalPanel {
  private element: HTMLElement;
  private selectedAnimal: Animal | null = null;

  constructor() {
    this.element = document.createElement('div');
    this.element.id = 'animal-panel';
    this.element.style.cssText = `
      position: fixed;
      right: 16px;
      top: 64px;
      width: 260px;
      background: rgba(20, 20, 35, 0.92);
      border: 1px solid rgba(100, 200, 255, 0.3);
      border-radius: 8px;
      color: #e0e0e0;
      font-family: monospace;
      font-size: 13px;
      padding: 12px;
      display: none;
      z-index: 100;
      pointer-events: auto;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    `;
    document.body.appendChild(this.element);

    // Close on Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  }

  /** Show panel for a specific animal */
  show(animal: Animal): void {
    this.selectedAnimal = animal;
    this.render();
    this.element.style.display = 'block';
  }

  /** Close the panel */
  close(): void {
    this.selectedAnimal = null;
    this.element.style.display = 'none';
  }

  /** Get currently selected animal */
  getSelected(): Animal | null {
    return this.selectedAnimal;
  }

  /** Update the panel display (call each frame if visible) */
  refresh(): void {
    if (this.selectedAnimal) {
      this.render();
    }
  }

  private render(): void {
    const a = this.selectedAnimal;
    if (!a) return;

    // Clear previous content
    this.element.textContent = '';

    const f = a.happinessFactors;
    const habitatReq = HABITAT_TYPES[a.species.habitatType];

    // Header row
    const header = this.div('display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;');
    const title = this.el('div', a.species.name, 'font-size:15px; font-weight:bold; color:#fff;');
    const closeBtn = this.el('button', 'x', `
      background:none; border:none; color:#888; cursor:pointer;
      font-size:18px; padding:0 4px; line-height:1;
    `);
    closeBtn.addEventListener('click', () => this.close());
    header.append(title, closeBtn);

    // Species info row
    const infoRow = this.div('display:flex; gap:8px; margin-bottom:10px;');
    const swatch = this.div(`
      width:40px; height:40px; border-radius:50%;
      background:#${a.species.color.toString(16).padStart(6, '0')};
      border:2px solid rgba(255,255,255,0.2); flex-shrink:0;
    `);
    const meta = this.div('flex:1;');
    meta.append(
      this.el('div', `${a.species.category.replace('_', ' ').toUpperCase()} / ${a.species.size}`, 'color:#aaa; font-size:11px;'),
      this.el('div', `State: ${a.state}`, 'color:#aaa; font-size:11px;'),
      this.el('div', `Habitat: ${habitatReq.name}`, 'color:#aaa; font-size:11px;'),
    );
    infoRow.append(swatch, meta);

    // Happiness bar
    const happyColor = this.getHappinessColor(a.happiness);
    const happySection = this.div('margin-bottom:6px;');
    const happyHeader = this.div('display:flex; justify-content:space-between; margin-bottom:2px;');
    happyHeader.append(
      this.el('span', 'Happiness'),
      this.el('span', `${a.happiness}/100`, `color:${happyColor}; font-weight:bold;`),
    );
    happySection.append(happyHeader, this.bar(a.happiness, 100, happyColor, 8));

    // Factors section
    const factorsLabel = this.el('div', 'FACTORS',
      'font-size:11px; color:#888; margin:8px 0 4px; border-top:1px solid rgba(255,255,255,0.1); padding-top:6px;');

    // Species details section
    const specLabel = this.el('div', 'SPECIES INFO',
      'font-size:11px; color:#888; margin:8px 0 4px; border-top:1px solid rgba(255,255,255,0.1); padding-top:6px;');
    const specInfo = this.div('font-size:11px; color:#bbb; line-height:1.6;');
    specInfo.append(
      this.el('div', `Food: ${a.species.foodType}`),
      this.el('div', `Speed: ${a.species.moveSpeed} tiles/s`),
      this.el('div', `Space needed: ${a.species.spacePerAnimal} tiles`),
      this.el('div', `Swims: ${a.species.canSwim ? 'Yes' : 'No'}`),
    );

    this.element.append(
      header, infoRow, happySection, factorsLabel,
      this.factorRow('Terrain', f.terrain, 25, '#6a6'),
      this.factorRow('Space', f.space, 20, '#6a6'),
      this.factorRow('Food', f.food, 20, '#ca6'),
      this.factorRow('Enrichment', f.enrichment, 20, '#6ac'),
      this.factorRow('Companions', f.companions, 15, '#a6c'),
      specLabel, specInfo,
    );
  }

  private factorRow(label: string, value: number, max: number, color: string): HTMLElement {
    const row = this.div('display:flex; align-items:center; gap:6px; margin-bottom:3px; font-size:11px;');
    row.append(
      this.el('span', label, 'width:72px; color:#aaa;'),
      this.bar(value, max, color, 6),
      this.el('span', `${value}`, 'width:28px; text-align:right; color:#ccc;'),
    );
    return row;
  }

  private bar(value: number, max: number, color: string, height: number): HTMLElement {
    const pct = Math.round((value / max) * 100);
    const outer = this.div(`flex:1; height:${height}px; background:rgba(255,255,255,0.1); border-radius:${height / 2}px; overflow:hidden;`);
    const inner = this.div(`width:${pct}%; height:100%; background:${color}; border-radius:${height / 2}px; transition:width 0.3s;`);
    outer.appendChild(inner);
    return outer;
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

  private getHappinessColor(happiness: number): string {
    if (happiness >= 80) return '#4caf50';
    if (happiness >= 60) return '#8bc34a';
    if (happiness >= 40) return '#ffc107';
    if (happiness >= 20) return '#ff9800';
    return '#f44336';
  }
}
