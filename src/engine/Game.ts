import { Application } from 'pixi.js';
import { Camera } from './Camera';
import { InputManager } from './InputManager';
import { IsometricRenderer } from './IsometricRenderer';
import { TileMap, TILE_PROPERTIES } from '../world/TileMap';
import { screenToTile, isInBounds, tileToScreen } from '../utils/IsoMath';

/** Main game class — orchestrates the game loop, rendering, and input */
export class Game {
  private app: Application;
  private camera: Camera;
  private input!: InputManager;
  private renderer!: IsometricRenderer;
  private tileMap: TileMap;

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
    this.app.stage.addChild(this.renderer.container);

    // Generate the starter map
    this.tileMap.generateStarterMap();

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
    this.handleInput();
    this.camera.update();
    this.updateHoverHighlight();
    this.renderer.render();
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
    } else {
      this.renderer.clearHighlight();
    }
  }

  private handleTileClick(screenX: number, screenY: number): void {
    const world = this.camera.screenToWorld(screenX, screenY);
    const tile = screenToTile(world.x, world.y);

    if (isInBounds(tile.x, tile.y, this.tileMap.width, this.tileMap.height)) {
      const cell = this.tileMap.getCell(tile.x, tile.y);
      if (cell) {
        const props = TILE_PROPERTIES[cell.type];
        console.log(`Clicked tile (${tile.x}, ${tile.y}): ${props.label}`);

        // Update HUD tile display
        const hudTile = document.getElementById('hud-tile');
        if (hudTile) {
          hudTile.textContent = `(${tile.x}, ${tile.y}) ${props.label}`;
        }
      }
    }
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
