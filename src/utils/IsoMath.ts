/** Isometric coordinate conversion utilities */

/** Standard isometric tile dimensions */
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

/** Convert tile grid coordinates to screen (pixel) position */
export function tileToScreen(tileX: number, tileY: number): { x: number; y: number } {
  return {
    x: (tileX - tileY) * (TILE_WIDTH / 2),
    y: (tileX + tileY) * (TILE_HEIGHT / 2),
  };
}

/** Convert screen (pixel) position to tile grid coordinates */
export function screenToTile(screenX: number, screenY: number): { x: number; y: number } {
  return {
    x: Math.floor(screenX / TILE_WIDTH + screenY / TILE_HEIGHT),
    y: Math.floor(screenY / TILE_HEIGHT - screenX / TILE_WIDTH),
  };
}

/** Get the tile coordinates under a given screen point, accounting for camera */
export function screenToTileWithCamera(
  screenX: number,
  screenY: number,
  cameraX: number,
  cameraY: number,
  zoom: number
): { x: number; y: number } {
  const worldX = (screenX - cameraX) / zoom;
  const worldY = (screenY - cameraY) / zoom;
  return screenToTile(worldX, worldY);
}

/** Calculate depth sort value for isometric rendering (higher = drawn later = in front) */
export function depthSort(tileX: number, tileY: number, layer: number = 0): number {
  return (tileX + tileY) * 100 + layer;
}

/** Check if a tile coordinate is within map bounds */
export function isInBounds(tileX: number, tileY: number, mapWidth: number, mapHeight: number): boolean {
  return tileX >= 0 && tileX < mapWidth && tileY >= 0 && tileY < mapHeight;
}

/** Get the center screen position of a tile */
export function tileCenterScreen(tileX: number, tileY: number): { x: number; y: number } {
  const pos = tileToScreen(tileX, tileY);
  return {
    x: pos.x + TILE_WIDTH / 2,
    y: pos.y + TILE_HEIGHT / 2,
  };
}

/** Manhattan distance between two tiles */
export function tileDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}
