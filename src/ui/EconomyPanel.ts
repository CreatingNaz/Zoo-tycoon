import { EconomySystem, Transaction } from '../simulation/EconomySystem';

/** Financial overview panel — toggled with 'E' key */
export class EconomyPanel {
  private element: HTMLElement;
  private visible = false;
  private economySystem: EconomySystem;

  /** Callback to close ZooStatsPanel when this opens */
  onOpen?: () => void;

  constructor(economySystem: EconomySystem) {
    this.economySystem = economySystem;

    this.element = document.createElement('div');
    this.element.id = 'economy-panel';
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
      z-index: 90;
      pointer-events: auto;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      max-height: 80vh;
      overflow-y: auto;
    `;
    document.body.appendChild(this.element);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'e' || e.key === 'E') {
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

    const money = this.economySystem.getMoney();
    const income = this.economySystem.lastIncomePerMinute;
    const expenses = this.economySystem.lastExpensesPerMinute;
    const net = this.economySystem.getNetProfitPerMinute();
    const admissionPrice = this.economySystem.getAdmissionPrice(0); // updated via zooRating externally

    // Header
    const header = this.div('display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;');
    const title = this.el('div', 'Economy', 'font-size:14px; font-weight:bold; color:#64ffda;');
    const closeBtn = this.el('button', 'x', `
      background:none; border:none; color:#888; cursor:pointer;
      font-size:18px; padding:0 4px; line-height:1;
    `);
    closeBtn.addEventListener('click', () => this.toggle());
    header.append(title, closeBtn);
    this.element.appendChild(header);

    // Balance
    const balRow = this.statRow('Balance', `$${Math.floor(money).toLocaleString()}`, '#64ffda');
    this.element.appendChild(balRow);

    // Income / Expenses / Net
    this.element.appendChild(this.statRow('Income/min', `$${Math.floor(income).toLocaleString()}`, '#4caf50'));
    this.element.appendChild(this.statRow('Expenses/min', `$${Math.floor(expenses).toLocaleString()}`, '#f44336'));

    const netColor = net >= 0 ? '#4caf50' : '#f44336';
    const netSign = net >= 0 ? '+' : '';
    this.element.appendChild(this.statRow('Net/min', `${netSign}$${Math.floor(Math.abs(net)).toLocaleString()}`, netColor));

    // Separator
    this.element.appendChild(this.div('height:1px; background:rgba(255,255,255,0.1); margin:8px 0;'));

    // Recent transactions
    const txHeader = this.el('div', 'Recent Transactions', 'font-size:12px; color:#8892b0; margin-bottom:6px;');
    this.element.appendChild(txHeader);

    const transactions = this.economySystem.getRecentTransactions(10);
    if (transactions.length === 0) {
      this.element.appendChild(this.el('div', 'No transactions yet', 'color:#555; font-size:11px;'));
    } else {
      for (let i = transactions.length - 1; i >= 0; i--) {
        this.element.appendChild(this.transactionRow(transactions[i]));
      }
    }
  }

  private transactionRow(tx: Transaction): HTMLElement {
    const row = this.div('display:flex; justify-content:space-between; padding:2px 0; font-size:11px;');
    const reasonEl = this.el('span', tx.reason, 'color:#8892b0; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;');
    const sign = tx.amount >= 0 ? '+' : '';
    const color = tx.amount >= 0 ? '#4caf50' : '#f44336';
    const amtEl = this.el('span', `${sign}$${Math.abs(tx.amount).toLocaleString()}`, `color:${color}; font-weight:bold;`);
    row.append(reasonEl, amtEl);
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
}
