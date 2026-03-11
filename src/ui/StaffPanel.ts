import { STAFF_ROLES, StaffRole } from '../data/staff';
import { StaffSystem } from '../simulation/StaffSystem';
import { EconomySystem } from '../simulation/EconomySystem';

/** Staff management panel — toggled with 'T' key */
export class StaffPanel {
  private element: HTMLElement;
  private visible = false;
  private staffSystem: StaffSystem;
  private economySystem: EconomySystem;

  /** Tile to spawn staff at (set from Game when opening) */
  spawnTileX = 32;
  spawnTileY = 32;

  /** Callback when panel opens (for mutual exclusion) */
  onOpen?: () => void;

  constructor(staffSystem: StaffSystem, economySystem: EconomySystem) {
    this.staffSystem = staffSystem;
    this.economySystem = economySystem;

    this.element = document.createElement('div');
    this.element.id = 'staff-panel';
    this.element.style.cssText = `
      position: fixed;
      right: 16px;
      top: 64px;
      width: 280px;
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
      if (e.key === 't' || e.key === 'T') {
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

  refresh(): void {
    if (this.visible) this.render();
  }

  private render(): void {
    this.element.textContent = '';

    // Header
    const header = this.div('display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;');
    const title = this.el('div', 'Staff Management', 'font-size:14px; font-weight:bold; color:#64ffda;');
    const closeBtn = this.el('button', 'x', `
      background:none; border:none; color:#888; cursor:pointer;
      font-size:18px; padding:0 4px; line-height:1;
    `);
    closeBtn.addEventListener('click', () => this.toggle());
    header.append(title, closeBtn);
    this.element.appendChild(header);

    // Summary
    const counts = this.staffSystem.getCounts();
    const totalSalary = this.staffSystem.getTotalSalaryPerMinute();
    this.element.appendChild(
      this.statRow('Total Staff', `${this.staffSystem.staff.length}`, '#e0e0e0'),
    );
    this.element.appendChild(
      this.statRow('Salaries/min', `$${totalSalary}`, '#f44336'),
    );

    // Separator
    this.element.appendChild(this.div('height:1px; background:rgba(255,255,255,0.1); margin:8px 0;'));

    // Role cards with hire/fire buttons
    for (const [roleId, role] of Object.entries(STAFF_ROLES)) {
      this.element.appendChild(this.renderRoleCard(role, counts[roleId] ?? 0));
    }
  }

  private renderRoleCard(role: StaffRole, count: number): HTMLElement {
    const card = this.div(`
      border: 1px solid #${role.color.toString(16).padStart(6, '0')}40;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 6px;
      padding: 8px;
      margin-bottom: 8px;
    `);

    // Header row
    const headerRow = this.div('display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;');
    const nameEl = this.el('span', role.name, `font-weight:bold; color:#${role.color.toString(16).padStart(6, '0')};`);
    const countEl = this.el('span', `x${count}`, 'color:#aaa; font-size:12px;');
    headerRow.append(nameEl, countEl);
    card.appendChild(headerRow);

    // Description
    card.appendChild(this.el('div', role.description, 'font-size:10px; color:#888; margin-bottom:6px; line-height:1.3;'));

    // Cost info
    const costRow = this.div('display:flex; gap:12px; font-size:10px; color:#aaa; margin-bottom:6px;');
    costRow.appendChild(this.el('span', `Hire: $${role.hireCost}`, ''));
    costRow.appendChild(this.el('span', `Salary: $${role.salary}/min`, ''));
    card.appendChild(costRow);

    // Buttons
    const btnRow = this.div('display:flex; gap:6px;');

    const hireBtn = this.el('button', 'Hire', `
      background: rgba(76, 175, 80, 0.2);
      border: 1px solid #4caf50;
      color: #4caf50;
      padding: 4px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      font-family: inherit;
    `);
    if (!this.economySystem.canAfford(role.hireCost)) {
      hireBtn.style.opacity = '0.4';
      hireBtn.style.cursor = 'default';
    } else {
      hireBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.staffSystem.hire(role.id, this.spawnTileX, this.spawnTileY);
        this.render();
      });
    }
    btnRow.appendChild(hireBtn);

    if (count > 0) {
      const fireBtn = this.el('button', 'Fire', `
        background: rgba(244, 67, 54, 0.2);
        border: 1px solid #f44336;
        color: #f44336;
        padding: 4px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
        font-family: inherit;
      `);
      fireBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Fire the last hired of this role
        const member = [...this.staffSystem.staff].reverse().find(s => s.role.id === role.id);
        if (member) {
          this.staffSystem.fire(member);
          this.render();
        }
      });
      btnRow.appendChild(fireBtn);
    }

    card.appendChild(btnRow);
    return card;
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
}
