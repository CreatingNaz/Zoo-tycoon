/** Zoo statistics overlay panel — toggled with 'V' key */
export class ZooStatsPanel {
  private element: HTMLElement;
  private visible = false;

  // Stats state
  private visitorCount = 0;
  private zooRating = 0;
  private totalIncome = 0;
  private incomeRate = 0;
  private avgAnimalHappiness = 0;
  private facilityCount = 0;
  private staffCount = 0;

  constructor() {
    this.element = document.createElement('div');
    this.element.id = 'zoo-stats-panel';
    this.element.style.cssText = `
      position: fixed;
      right: 16px;
      top: 64px;
      width: 220px;
      background: rgba(20, 20, 35, 0.92);
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
      if (e.key === 'v' || e.key === 'V') {
        if ((e.target as HTMLElement).tagName === 'INPUT') return;
        this.toggle();
      }
    });
  }

  get isVisible(): boolean { return this.visible; }

  /** Callback when stats panel opens */
  onOpen?: () => void;

  hide(): void {
    this.visible = false;
    this.element.style.display = 'none';
  }

  toggle(): void {
    this.visible = !this.visible;
    this.element.style.display = this.visible ? 'block' : 'none';
    if (this.visible) {
      this.onOpen?.();
      this.render();
    }
  }

  /** Update stats data */
  updateStats(data: {
    visitorCount: number;
    zooRating: number;
    totalIncome: number;
    incomeRate: number;
    avgAnimalHappiness: number;
    facilityCount: number;
    staffCount?: number;
  }): void {
    this.visitorCount = data.visitorCount;
    this.zooRating = data.zooRating;
    this.totalIncome = data.totalIncome;
    this.incomeRate = data.incomeRate;
    this.avgAnimalHappiness = data.avgAnimalHappiness;
    this.facilityCount = data.facilityCount;
    this.staffCount = data.staffCount ?? 0;

    if (this.visible) this.render();
  }

  private render(): void {
    this.element.textContent = '';

    // Header
    const header = this.div('display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;');
    const title = this.el('div', 'Zoo Statistics', 'font-size:14px; font-weight:bold; color:#64ffda;');
    const closeBtn = this.el('button', 'x', `
      background:none; border:none; color:#888; cursor:pointer;
      font-size:18px; padding:0 4px; line-height:1;
    `);
    closeBtn.addEventListener('click', () => this.toggle());
    header.append(title, closeBtn);

    // Rating stars
    const stars = this.renderStars(this.zooRating);

    // Stats rows
    const stats = [
      { label: 'Visitors', value: `${this.visitorCount}`, color: '#FFaa44' },
      { label: 'Total Income', value: `$${Math.floor(this.totalIncome).toLocaleString()}`, color: '#64ffda' },
      { label: 'Income Rate', value: `$${Math.floor(this.incomeRate)}/min`, color: '#64ffda' },
      { label: 'Avg Happiness', value: `${Math.round(this.avgAnimalHappiness)}%`, color: this.getHappinessColor(this.avgAnimalHappiness) },
      { label: 'Facilities', value: `${this.facilityCount}`, color: '#ccc' },
      { label: 'Staff', value: `${this.staffCount}`, color: '#2196f3' },
    ];

    this.element.append(header, stars);
    for (const stat of stats) {
      this.element.appendChild(this.statRow(stat.label, stat.value, stat.color));
    }
  }

  private renderStars(rating: number): HTMLElement {
    const row = this.div('text-align:center; margin-bottom:10px; font-size:18px; letter-spacing:4px;');
    let text = '';
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.5;
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) text += '\u2605'; // filled star
      else if (i === fullStars && hasHalf) text += '\u2606'; // half (outline star)
      else text += '\u2606'; // empty star
    }
    const starsEl = this.el('span', text, `color:#FFD700;`);
    const label = this.el('div', `Rating: ${rating.toFixed(1)} / 5.0`, 'font-size:11px; color:#aaa; margin-top:2px;');
    row.append(starsEl, label);
    return row;
  }

  private statRow(label: string, value: string, color: string): HTMLElement {
    const row = this.div('display:flex; justify-content:space-between; padding:3px 0; border-bottom:1px solid rgba(255,255,255,0.05);');
    row.append(
      this.el('span', label, 'color:#8892b0; font-size:12px;'),
      this.el('span', value, `color:${color}; font-weight:bold; font-size:12px;`),
    );
    return row;
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

  private getHappinessColor(h: number): string {
    if (h >= 80) return '#4caf50';
    if (h >= 60) return '#8bc34a';
    if (h >= 40) return '#ffc107';
    if (h >= 20) return '#ff9800';
    return '#f44336';
  }
}
