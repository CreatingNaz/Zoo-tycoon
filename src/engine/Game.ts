import { Application } from 'pixi.js';
import { Camera } from './Camera';
import { InputManager } from './InputManager';
import { IsometricRenderer } from './IsometricRenderer';
import { SpriteRenderer } from './SpriteRenderer';
import { TileMap, TileType, TILE_PROPERTIES } from '../world/TileMap';
import { Animal } from '../entities/Animal';
import { SPECIES } from '../data/species';
import { BuildPanel } from '../ui/BuildPanel';
import { BuildItem } from '../data/buildings';
import { HabitatDetector } from '../world/Habitat';
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
  private currentBuildItem: BuildItem | null = null;
  private habitatDetector!: HabitatDetector;

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

    // Spawn demo animals
    this.spawnDemoAnimals();

    // Initialize habitat detector
    this.habitatDetector = new HabitatDetector(this.tileMap);

    // Initialize build panel
    this.buildPanel = new BuildPanel();
    this.buildPanel.onSelectionChange = (item) => {
      this.currentBuildItem = item;
      if (!item) {
        this.renderer.clearGhost();
      }
    };

    // Center camera on the middle of the tile map
    // tileToScreen(32,32) for a 64x64 map = ((32-32)*32, (32+32)*16) = (0, 1024)
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

    this.updateHoverHighlight();
    this.renderer.render(deltaMs);

    // Render entity sprites
    const spriteEntities = this.animals.map(a => a.toSpriteEntity());
    this.spriteRenderer.render(spriteEntities, deltaMs);

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

    // Build mode: place tile or decoration
    if (this.currentBuildItem) {
      if (this.currentBuildItem.tileType) {
        // Tile-based item (terrain, paths, fencing)
        this.tileMap.setCell(tile.x, tile.y, this.currentBuildItem.tileType);
        this.updateHUDMoney(-this.currentBuildItem.cost);

        // Re-detect habitats when fences are placed
        if (TileMap.isFence(this.currentBuildItem.tileType)) {
          const habitats = this.habitatDetector.detectAll();
          if (habitats.length > 0) {
            console.log(`Detected ${habitats.length} habitat(s):`, habitats.map(h => `${h.area} tiles`));
          }
        }
      } else {
        // Decoration / habitat object
        this.tileMap.setDecoration(tile.x, tile.y, {
          id: this.currentBuildItem.id,
          color: this.currentBuildItem.color,
          label: this.currentBuildItem.label,
        });
        this.updateHUDMoney(-this.currentBuildItem.cost);
      }
      return;
    }

    // Normal mode: inspect tile
    const cell = this.tileMap.getCell(tile.x, tile.y);
    if (cell) {
      const props = TILE_PROPERTIES[cell.type];
      console.log(`Clicked tile (${tile.x}, ${tile.y}): ${props.label}`);

      const hudTile = document.getElementById('hud-tile');
      if (hudTile) {
        hudTile.textContent = `(${tile.x}, ${tile.y}) ${props.label}`;
      }
    }
  }

  private updateHUDMoney(delta: number): void {
    const hudMoney = document.getElementById('hud-money');
    if (hudMoney) {
      const current = parseInt(hudMoney.textContent?.replace(/[$,]/g, '') || '10000', 10);
      const next = Math.max(0, current + delta);
      hudMoney.textContent = `$${next.toLocaleString()}`;
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
    if (hudCamera) {
      hudCamera.textContent = `${Math.round(this.camera.x)}, ${Math.round(this.camera.y)}`;
    }
    if (hudZoom) {
      hudZoom.textContent = `${this.camera.zoom.toFixed(1)}x`;
    }
  }
}
