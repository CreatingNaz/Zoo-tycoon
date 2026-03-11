import { Assets, Spritesheet, Texture } from 'pixi.js';

/** Sprite animation metadata matching render_spritesheet.py output */
export interface SpriteMetadata {
  name: string;
  frameSize: { width: number; height: number };
  animations: Record<string, {
    frameCount: number;
    frameDuration: number;
    directions: string[];
  }>;
}

/** Tracks all loaded assets */
export class AssetLoader {
  private static textures = new Map<string, Texture>();
  private static spritesheets = new Map<string, Spritesheet>();
  private static metadata = new Map<string, SpriteMetadata>();
  private static loaded = false;

  /** Load all game assets. Call once during init. */
  static async loadAll(): Promise<void> {
    if (this.loaded) return;

    // Load sprite metadata files
    // In production these would be fetched from public/assets/sprites/
    // For now we register programmatic placeholder sprites

    this.loaded = true;
  }

  /** Register a texture by key */
  static registerTexture(key: string, texture: Texture): void {
    this.textures.set(key, texture);
  }

  /** Get a texture by key */
  static getTexture(key: string): Texture | undefined {
    return this.textures.get(key);
  }

  /** Register sprite metadata */
  static registerMetadata(key: string, meta: SpriteMetadata): void {
    this.metadata.set(key, meta);
  }

  /** Get sprite metadata */
  static getMetadata(key: string): SpriteMetadata | undefined {
    return this.metadata.get(key);
  }

  /** Check if assets are loaded */
  static isLoaded(): boolean {
    return this.loaded;
  }
}
