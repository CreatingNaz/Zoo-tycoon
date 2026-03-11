/** Camera handling pan, zoom, and smooth interpolation for the isometric view */
export class Camera {
  /** World position (top-left corner of viewport in world coordinates) */
  x: number = 0;
  y: number = 0;

  /** Target position for smooth interpolation */
  private targetX: number = 0;
  private targetY: number = 0;

  /** Zoom level */
  zoom: number = 1;
  private targetZoom: number = 1;

  readonly minZoom = 0.25;
  readonly maxZoom = 3;

  /** Smoothing factor (0 = no movement, 1 = instant snap) */
  private smoothing = 0.12;

  /** Viewport dimensions */
  viewportWidth: number;
  viewportHeight: number;

  constructor(viewportWidth: number, viewportHeight: number) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
  }

  /** Set camera position immediately (no interpolation) */
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
  }

  /** Move camera by a delta in screen space */
  pan(dx: number, dy: number): void {
    this.targetX -= dx / this.zoom;
    this.targetY -= dy / this.zoom;
  }

  /** Zoom toward/away from a screen point */
  zoomAt(screenX: number, screenY: number, delta: number): void {
    const zoomFactor = 1 - delta * 0.001;
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetZoom * zoomFactor));

    // Zoom toward the mouse position
    const worldX = (screenX - this.viewportWidth / 2) / this.zoom + this.x;
    const worldY = (screenY - this.viewportHeight / 2) / this.zoom + this.y;

    this.targetZoom = newZoom;

    // Adjust position so the point under the cursor stays fixed
    this.targetX = worldX - (screenX - this.viewportWidth / 2) / newZoom;
    this.targetY = worldY - (screenY - this.viewportHeight / 2) / newZoom;
  }

  /** Center camera on a world position */
  centerOn(worldX: number, worldY: number): void {
    this.targetX = worldX;
    this.targetY = worldY;
  }

  /** Update camera position with smooth interpolation */
  update(): void {
    this.x += (this.targetX - this.x) * this.smoothing;
    this.y += (this.targetY - this.y) * this.smoothing;
    this.zoom += (this.targetZoom - this.zoom) * this.smoothing;
  }

  /** Convert screen coordinates to world coordinates */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.viewportWidth / 2) / this.zoom + this.x,
      y: (screenY - this.viewportHeight / 2) / this.zoom + this.y,
    };
  }

  /** Get the transform values for the PixiJS container */
  getContainerTransform(): { x: number; y: number; scale: number } {
    return {
      x: this.viewportWidth / 2 - this.x * this.zoom,
      y: this.viewportHeight / 2 - this.y * this.zoom,
      scale: this.zoom,
    };
  }
}
