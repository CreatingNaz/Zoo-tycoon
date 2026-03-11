import { BUILD_ITEMS, BuildCategory, BuildItem, CATEGORY_LABELS } from '../data/buildings';

/** Manages the build panel UI and selection state */
export class BuildPanel {
  private panel: HTMLElement;
  private toggle: HTMLElement;
  private categoriesEl: HTMLElement;
  private itemsEl: HTMLElement;
  private closeBtn: HTMLElement;

  private _active = false;
  private _selectedCategory: BuildCategory = 'terrain';
  private _selectedItem: BuildItem | null = null;

  /** Callback when an item is selected/deselected */
  onSelectionChange?: (item: BuildItem | null) => void;

  constructor() {
    this.panel = document.getElementById('build-panel')!;
    this.toggle = document.getElementById('build-toggle')!;
    this.categoriesEl = document.getElementById('build-categories')!;
    this.itemsEl = document.getElementById('build-items')!;
    this.closeBtn = document.getElementById('build-close')!;

    this.toggle.addEventListener('click', () => this.open());
    this.closeBtn.addEventListener('click', () => this.close());

    // Keyboard shortcut
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'b') {
        if (this._active) this.close();
        else this.open();
      }
      if (e.key === 'Escape' && this._active) {
        this.close();
      }
    });

    this.renderCategories();
    this.renderItems();
  }

  get active(): boolean { return this._active; }
  get selectedItem(): BuildItem | null { return this._selectedItem; }

  open(): void {
    this._active = true;
    this.panel.classList.add('active');
    this.toggle.classList.add('active');
  }

  close(): void {
    this._active = false;
    this._selectedItem = null;
    this.panel.classList.remove('active');
    this.toggle.classList.remove('active');
    this.onSelectionChange?.(null);
  }

  private renderCategories(): void {
    this.categoriesEl.textContent = '';
    const categories: BuildCategory[] = ['terrain', 'paths', 'fencing', 'decorations', 'habitats'];

    for (const cat of categories) {
      const btn = document.createElement('button');
      btn.className = `build-cat-btn${cat === this._selectedCategory ? ' active' : ''}`;
      btn.textContent = CATEGORY_LABELS[cat];
      btn.addEventListener('click', () => {
        this._selectedCategory = cat;
        this._selectedItem = null;
        this.onSelectionChange?.(null);
        this.renderCategories();
        this.renderItems();
      });
      this.categoriesEl.appendChild(btn);
    }
  }

  private renderItems(): void {
    this.itemsEl.textContent = '';
    const items = BUILD_ITEMS.filter(i => i.category === this._selectedCategory);

    for (const item of items) {
      const el = document.createElement('div');
      el.className = `build-item${this._selectedItem?.id === item.id ? ' selected' : ''}`;

      const swatch = document.createElement('div');
      swatch.className = 'swatch';
      swatch.style.backgroundColor = `#${item.color.toString(16).padStart(6, '0')}`;

      const label = document.createElement('div');
      label.className = 'item-label';
      label.textContent = item.label;

      const cost = document.createElement('div');
      cost.className = 'item-cost';
      cost.textContent = `$${item.cost}`;

      el.appendChild(swatch);
      el.appendChild(label);
      el.appendChild(cost);

      el.addEventListener('click', () => {
        if (this._selectedItem?.id === item.id) {
          this._selectedItem = null;
        } else {
          this._selectedItem = item;
        }
        this.onSelectionChange?.(this._selectedItem);
        this.renderItems();
      });

      this.itemsEl.appendChild(el);
    }
  }
}
