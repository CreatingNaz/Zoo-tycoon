import { Application } from 'pixi.js';
import { Camera } from './Camera';
import { InputManager } from './InputManager';
import { IsometricRenderer } from './IsometricRenderer';
import { SpriteRenderer } from './SpriteRenderer';
import { TileMap, TileType, TILE_PROPERTIES } from '../world/TileMap';
import { Animal } from '../entities/Animal';
import { SPECIES } from '../data/species';
import { BuildPanel } from '../ui/BuildPanel';
import { AnimalPanel } from '../ui/AnimalPanel';
import { BuildItem } from '../data/buildings';
import { HabitatDetector, Habitat } from '../world/Habitat';
import { HappinessSystem } from '../simulation/HappinessSystem';
import { VisitorSystem } from '../simulation/VisitorSystem';
import { Visitor } from '../entities/Visitor';
import { ZooStatsPanel } from '../ui/ZooStatsPanel';
import { EconomySystem } from '../simulation/EconomySystem';
import { EconomyPanel } from '../ui/EconomyPanel';
import { ResearchSystem } from '../simulation/ResearchSystem';
import { ResearchPanel } from '../ui/ResearchPanel';
import { StaffSystem } from '../simulation/StaffSystem';
import { StaffPanel } from '../ui/StaffPanel';
import { Staff } from '../entities/Staff';
import { screenToTile, isInBounds, tileToScreen } from '../utils/IsoMath';

/** Main game class — orchestrates the game loop, rendering, and input */
export class Game {
  private app: Application;
  private camera: Camera;
  private input!: InputManager;
  private renderer!: IsometricRenderer;
  private spriteRenderer!: SpriteRenderer;
  private tileMap: TileMap;
  private animals: Animal[] = [];
  private buildPanel!: BuildPanel;
  private animalPanel!: AnimalPanel;
  private zooStatsPanel!: ZooStatsPanel;
  private currentBuildItem: BuildItem | null = null;
  private habitatDetector!: HabitatDetector;
  private happinessSystem!: HappinessSystem;
  private visitorSystem!: VisitorSystem;
  private economySystem!: EconomySystem;
  private economyPanel!: EconomyPanel;
  private researchSystem!: ResearchSystem;
  private researchPanel!: ResearchPanel;
  private staffSystem!: StaffSystem;
  private staffPanel!: StaffPanel;
  private habitats: Habitat[] = [];
  private visitors: Visitor[] = [];
  private zooRating = 1;

  // Happiness update throttle (every 2 seconds)
  private happinessTimer = 0;
  private readonly happinessInterval = 2000;

  // Upkeep tick (every 10 seconds)
  private upkeepTimer = 0;
  private readonly upkeepInterval = 10000;

  // Edge scrolling
  private readonly edgeScrollMargin = 40;
  private readonly edgeScrollSpeed = 8;

  // Keyboard pan speed
  private readonly keyPanSpeed = 6;

  constructor() {
    this.app = new Application();
    this.tileMap = new TileMap(64, 64);
    this.camera = new Camera(window.innerWidth, window.innerHeight);
  }

  async init(): Promise<void> {
    // Initialize PixiJS
    await this.app.init({
      background: 0x1a1a2e,
      resizeTo: window,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // Add canvas to DOM
    const container = document.getElementById('game-container');
    if (!container) throw new Error('Missing #game-container element');
    container.appendChild(this.app.canvas);

    // Initialize subsystems
    this.input = new InputManager(this.app.canvas as HTMLCanvasElement);
    this.renderer = new IsometricRenderer(this.tileMap, this.camera);
    this.spriteRenderer = new SpriteRenderer(this.camera);
    this.app.stage.addChild(this.renderer.container);
    this.renderer.container.addChild(this.spriteRenderer.container);

    // Generate the starter map
    this.tileMap.generateStarterMap();

    // Place a starter food stall near the center path intersection
    const cx = Math.floor(this.tileMap.width / 2);
    const cy = Math.floor(this.tileMap.height / 2);
    this.tileMap.setDecoration(cx + 2, cy, {
      id: 'food_stall',
      color: 0xE8A040,
      label: 'Food Stall',
    });

    // Initialize habitat detector
    this.habitatDetector = new HabitatDetector(this.tileMap);

    // Initialize happiness system
    this.happinessSystem = new HappinessSystem(this.tileMap);

    // Initialize visitor system
    this.visitorSystem = new VisitorSystem(this.tileMap);

    // Initialize economy system
    this.economySystem = new EconomySystem(10000);

    // Initialize research system
    this.researchSystem = new ResearchSystem(this.economySystem);

    // Initialize staff system
    this.staffSystem = new StaffSystem(this.tileMap, this.economySystem);

    // Spawn demo animals
    this.spawnDemoAnimals();

    // Initialize UI panels
    this.buildPanel = new BuildPanel();
    this.buildPanel.onSelectionChange = (item) => {
      this.currentBuildItem = item;
      if (!item) {
        this.renderer.clearGhost();
      }
    };

    this.animalPanel = new AnimalPanel();
    this.zooStatsPanel = new ZooStatsPanel();
    this.economyPanel = new EconomyPanel(this.economySystem);
    this.researchPanel = new ResearchPanel(this.researchSystem);
    this.staffPanel = new StaffPanel(this.staffSystem, this.economySystem);
    // Set staff spawn point to center path
    const spawnCenter = Math.floor(this.tileMap.width / 2);
    this.staffPanel.spawnTileX = spawnCenter;
    this.staffPanel.spawnTileY = spawnCenter;

    // Mutual exclusion: opening one panel closes the others
    const hideAll = () => { this.zooStatsPanel.hide(); this.economyPanel.hide(); this.researchPanel.hide(); this.staffPanel.hide(); };
    this.zooStatsPanel.onOpen = () => { hideAll(); };
    this.economyPanel.onOpen = () => { hideAll(); };
    this.researchPanel.onOpen = () => { hideAll(); };
    this.staffPanel.onOpen = () => { hideAll(); };

    // Center camera on the middle of the tile map
    const center = tileToScreen(
      Math.floor(this.tileMap.width / 2),
      Math.floor(this.tileMap.height / 2)
    );
    this.camera.setPosition(center.x, center.y);

    // Handle window resize
    window.addEventListener('resize', () => {
      this.camera.viewportWidth = window.innerWidth;
      this.camera.viewportHeight = window.innerHeight;
    });

    // Initial habitat detection
    this.habitats = this.habitatDetector.detectAll();

    // Start the game loop
    this.app.ticker.add(() => this.update());
  }

  private update(): void {
    const deltaMs = this.app.ticker.deltaMS;

    this.handleInput();
    this.camera.update();

    // Update animals
    for (const animal of this.animals) {
      animal.update(deltaMs);
    }

    // Tick research
    this.researchSystem.update(deltaMs);

    // Update staff AI
    this.staffSystem.update(deltaMs, this.habitats);

    // Periodically update happiness
    this.happinessTimer += deltaMs;
    if (this.happinessTimer >= this.happinessInterval) {
      this.happinessTimer = 0;
      const happinessMultiplier = this.researchSystem.getHappinessMultiplier()
        + this.staffSystem.getStaffHappinessBonus();
      this.happinessSystem.update(this.animals, this.habitats, happinessMultiplier);
      this.zooRating = this.visitorSystem.calculateZooRating(this.animals, this.habitats)
        + this.researchSystem.getRatingBonus()
        + this.staffSystem.getCleanlinessBonus();
      this.zooRating = Math.max(1, Math.min(5, this.zooRating));
      // Update admission price based on rating + research bonus
      const baseAdmission = this.economySystem.getAdmissionPrice(this.zooRating);
      this.visitorSystem.admissionPrice = Math.round(baseAdmission * this.researchSystem.getAdmissionMultiplier());
    }

    // Economy minute cycle
    this.economySystem.updateMinuteCycle(deltaMs);

    // Upkeep tick (with research reduction) + staff salaries
    this.upkeepTimer += deltaMs;
    if (this.upkeepTimer >= this.upkeepInterval) {
      this.upkeepTimer = 0;
      this.economySystem.tickUpkeep(
        this.animals.length,
        this.visitorSystem.countFacilities(),
        this.researchSystem.getUpkeepMultiplier(),
      );
      this.staffSystem.tickSalaries();
    }

    // Update visitors (with research capacity bonus)
    const visitorResult = this.visitorSystem.update(
      deltaMs, this.visitors, this.animals, this.habitats, this.zooRating,
      50 + this.researchSystem.getVisitorCapacityBonus(),
    );
    for (const v of visitorResult.spawned) this.visitors.push(v);
    for (const v of visitorResult.despawned) {
      const idx = this.visitors.indexOf(v);
      if (idx >= 0) this.visitors.splice(idx, 1);
    }
    if (visitorResult.income > 0) {
      this.economySystem.earn(visitorResult.income, 'Visitors');
    }

    // Update zoo stats panel
    this.zooStatsPanel.updateStats({
      visitorCount: this.visitors.length,
      zooRating: this.zooRating,
      totalIncome: this.economySystem.lastIncomePerMinute,
      incomeRate: this.economySystem.lastIncomePerMinute,
      avgAnimalHappiness: this.animals.length > 0
        ? this.animals.reduce((s, a) => s + a.happiness, 0) / this.animals.length : 0,
      facilityCount: this.visitorSystem.countFacilities(),
      staffCount: this.staffSystem.staff.length,
    });

    this.updateHoverHighlight();
    this.renderer.render(deltaMs);

    // Render entity sprites (animals + visitors + staff)
    const spriteEntities = [
      ...this.animals.map(a => a.toSpriteEntity()),
      ...this.visitors.map(v => v.toSpriteEntity()),
      ...this.staffSystem.staff.map(s => s.toSpriteEntity()),
    ];
    this.spriteRenderer.render(spriteEntities, deltaMs);

    // Refresh animal panel if open
    this.animalPanel.refresh();
    this.economyPanel.refresh();
    this.researchPanel.refresh();
    this.staffPanel.refresh();

    this.updateHUD();
  }

  private handleInput(): void {
    // Keyboard panning (WASD + arrow keys)
    if (this.input.isKeyDown('w') || this.input.isKeyDown('arrowup')) {
      this.camera.pan(0, this.keyPanSpeed);
    }
    if (this.input.isKeyDown('s') || this.input.isKeyDown('arrowdown')) {
      this.camera.pan(0, -this.keyPanSpeed);
    }
    if (this.input.isKeyDown('a') || this.input.isKeyDown('arrowleft')) {
      this.camera.pan(this.keyPanSpeed, 0);
    }
    if (this.input.isKeyDown('d') || this.input.isKeyDown('arrowright')) {
      this.camera.pan(-this.keyPanSpeed, 0);
    }

    // Mouse drag panning
    const drag = this.input.consumeDrag();
    if (drag.dx !== 0 || drag.dy !== 0) {
      this.camera.pan(drag.dx, drag.dy);
    }

    // Edge scrolling (only when mouse is on the canvas)
    const state = this.input.getState();
    if (state.mouseActive && state.mouseX < this.edgeScrollMargin) {
      this.camera.pan(this.edgeScrollSpeed, 0);
    } else if (state.mouseActive && state.mouseX > this.camera.viewportWidth - this.edgeScrollMargin) {
      this.camera.pan(-this.edgeScrollSpeed, 0);
    }
    if (state.mouseActive && state.mouseY < this.edgeScrollMargin + 48) { // 48 = HUD height
      this.camera.pan(0, this.edgeScrollSpeed);
    } else if (state.mouseActive && state.mouseY > this.camera.viewportHeight - this.edgeScrollMargin) {
      this.camera.pan(0, -this.edgeScrollSpeed);
    }

    // Zoom
    const scrollDelta = this.input.consumeScroll();
    if (scrollDelta !== 0) {
      this.camera.zoomAt(state.mouseX, state.mouseY, scrollDelta);
    }

    // Tile click
    if (state.clicked) {
      this.handleTileClick(state.clickScreenX, state.clickScreenY);
      this.input.consumeClick();
    }
  }

  private updateHoverHighlight(): void {
    const state = this.input.getState();
    const world = this.camera.screenToWorld(state.mouseX, state.mouseY);
    const tile = screenToTile(world.x, world.y);

    if (isInBounds(tile.x, tile.y, this.tileMap.width, this.tileMap.height)) {
      this.renderer.setHighlight(tile.x, tile.y);

      // Show ghost preview in build mode
      if (this.currentBuildItem) {
        this.renderer.setGhost(tile.x, tile.y, this.currentBuildItem.color);
      } else {
        this.renderer.clearGhost();
      }
    } else {
      this.renderer.clearHighlight();
      this.renderer.clearGhost();
    }
  }

  private handleTileClick(screenX: number, screenY: number): void {
    const world = this.camera.screenToWorld(screenX, screenY);
    const tile = screenToTile(world.x, world.y);

    if (!isInBounds(tile.x, tile.y, this.tileMap.width, this.tileMap.height)) return;

    // Build mode: place tile, decoration, or animal
    if (this.currentBuildItem) {
      // Afford check
      if (!this.economySystem.canAfford(this.currentBuildItem.cost)) {
        return; // Can't afford — don't place
      }

      if (this.currentBuildItem.category === 'animals') {
        // Animal placement — spawn a new animal at this tile
        const speciesData = SPECIES[this.currentBuildItem.id];
        if (!speciesData) return;
        this.economySystem.spend(this.currentBuildItem.cost, speciesData.name);
        const animal = new Animal(
          speciesData, tile.x, tile.y,
          tile.x - 4, tile.y - 4, tile.x + 4, tile.y + 4
        );
        this.animals.push(animal);
        this.assignAnimalsToHabitats();
      } else if (this.currentBuildItem.tileType) {
        // Tile-based item (terrain, paths, fencing)
        this.tileMap.setCell(tile.x, tile.y, this.currentBuildItem.tileType);
        this.economySystem.spend(this.currentBuildItem.cost, this.currentBuildItem.label);

        // Re-find entrances when paths are placed
        if (TileMap.isPath(this.currentBuildItem.tileType)) {
          this.visitorSystem.findEntrances();
        }
        // Re-detect habitats when fences are placed
        if (TileMap.isFence(this.currentBuildItem.tileType)) {
          this.habitats = this.habitatDetector.detectAll();
          this.assignAnimalsToHabitats();
          if (this.habitats.length > 0) {
            console.log(`Detected ${this.habitats.length} habitat(s):`, this.habitats.map(h => `${h.area} tiles`));
          }
        }
      } else {
        // Decoration / habitat object / facility
        this.tileMap.setDecoration(tile.x, tile.y, {
          id: this.currentBuildItem.id,
          color: this.currentBuildItem.color,
          label: this.currentBuildItem.label,
        });
        this.economySystem.spend(this.currentBuildItem.cost, this.currentBuildItem.label);
        // Trigger happiness recalc since enrichment changed
        this.happinessSystem.update(this.animals, this.habitats);
      }
      return;
    }

    // Normal mode: check if clicked on an animal first
    const clickedAnimal = this.findAnimalAt(tile.x, tile.y);
    if (clickedAnimal) {
      this.animalPanel.show(clickedAnimal);
      return;
    }

    // Otherwise inspect tile
    const cell = this.tileMap.getCell(tile.x, tile.y);
    if (cell) {
      const props = TILE_PROPERTIES[cell.type];
      const hudTile = document.getElementById('hud-tile');
      if (hudTile) {
        hudTile.textContent = `(${tile.x}, ${tile.y}) ${props.label}`;
      }
    }
  }

  /** Find an animal near the clicked tile position */
  private findAnimalAt(tileX: number, tileY: number): Animal | null {
    const clickRadius = 1.5; // tiles
    let closest: Animal | null = null;
    let closestDist = clickRadius;

    for (const animal of this.animals) {
      const dx = animal.tileX - tileX;
      const dy = animal.tileY - tileY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closestDist) {
        closestDist = dist;
        closest = animal;
      }
    }
    return closest;
  }

  /** Assign animals to detected habitats based on their tile position */
  private assignAnimalsToHabitats(): void {
    // Build a set lookup for each habitat
    const habitatTileSets = this.habitats.map(h => {
      const set = new Set<string>();
      for (const t of h.tiles) set.add(`${Math.floor(t.x)},${Math.floor(t.y)}`);
      return { habitat: h, set };
    });

    for (const animal of this.animals) {
      const key = `${Math.floor(animal.tileX)},${Math.floor(animal.tileY)}`;
      let found = false;
      for (const { habitat, set } of habitatTileSets) {
        if (set.has(key)) {
          animal.habitatId = habitat.id;
          // Update bounds to match habitat bounding box
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const t of habitat.tiles) {
            if (t.x < minX) minX = t.x;
            if (t.y < minY) minY = t.y;
            if (t.x > maxX) maxX = t.x + 1;
            if (t.y > maxY) maxY = t.y + 1;
          }
          animal.boundsMinX = minX;
          animal.boundsMinY = minY;
          animal.boundsMaxX = maxX;
          animal.boundsMaxY = maxY;
          found = true;
          break;
        }
      }
      if (!found) {
        animal.habitatId = null;
      }
    }
  }


  /** Spawn demo animals for testing */
  private spawnDemoAnimals(): void {
    const cx = Math.floor(this.tileMap.width / 2);
    const cy = Math.floor(this.tileMap.height / 2);

    // Komodo dragon near center-left
    this.animals.push(new Animal(
      SPECIES.komodo_dragon, cx - 6, cy - 3,
      cx - 10, cy - 6, cx - 2, cy + 2
    ));

    // Green iguana near center
    this.animals.push(new Animal(
      SPECIES.green_iguana, cx - 4, cy + 4,
      cx - 8, cy + 1, cx, cy + 7
    ));

    // Chameleon near top
    this.animals.push(new Animal(
      SPECIES.chameleon, cx + 3, cy - 5,
      cx, cy - 8, cx + 6, cy - 2
    ));

    // Galápagos tortoise near bottom
    this.animals.push(new Animal(
      SPECIES.galapagos_tortoise, cx + 5, cy + 5,
      cx + 2, cy + 2, cx + 9, cy + 8
    ));

    // Saltwater croc near the pond
    this.animals.push(new Animal(
      SPECIES.saltwater_croc, cx + 7, cy - 1,
      cx + 4, cy - 3, cx + 12, cy + 3
    ));

    // Poison dart frog
    this.animals.push(new Animal(
      SPECIES.poison_dart_frog, cx - 3, cy - 6,
      cx - 6, cy - 9, cx, cy - 3
    ));

    // Leopard gecko
    this.animals.push(new Animal(
      SPECIES.leopard_gecko, cx + 2, cy + 3,
      cx - 1, cy + 1, cx + 5, cy + 6
    ));

    // Axolotl near the water
    this.animals.push(new Animal(
      SPECIES.axolotl, cx + 9, cy + 1,
      cx + 6, cy - 2, cx + 12, cy + 4
    ));
  }

  private updateHUD(): void {
    const hudCamera = document.getElementById('hud-camera');
    const hudZoom = document.getElementById('hud-zoom');
    const hudVisitors = document.getElementById('hud-visitors');
    const hudRating = document.getElementById('hud-rating');
    const hudMoney = document.getElementById('hud-money');
    const hudProfit = document.getElementById('hud-profit');
    if (hudCamera) {
      hudCamera.textContent = `${Math.round(this.camera.x)}, ${Math.round(this.camera.y)}`;
    }
    if (hudZoom) {
      hudZoom.textContent = `${this.camera.zoom.toFixed(1)}x`;
    }
    if (hudVisitors) {
      hudVisitors.textContent = `${this.visitors.length}`;
    }
    if (hudRating) {
      hudRating.textContent = `${this.zooRating.toFixed(1)}`;
    }
    if (hudMoney) {
      hudMoney.textContent = `$${Math.floor(this.economySystem.getMoney()).toLocaleString()}`;
    }
    if (hudProfit) {
      const net = this.economySystem.getNetProfitPerMinute();
      if (net > 0) {
        hudProfit.textContent = '\u25B2'; // up arrow
        hudProfit.style.color = '#4caf50';
      } else if (net < 0) {
        hudProfit.textContent = '\u25BC'; // down arrow
        hudProfit.style.color = '#f44336';
      } else {
        hudProfit.textContent = '';
      }
    }
  }
}
