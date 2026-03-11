/** Centralized input handling for keyboard, mouse, and touch */

export interface InputState {
  /** Currently pressed keys */
  keys: Set<string>;
  /** Mouse position in screen coordinates */
  mouseX: number;
  mouseY: number;
  /** Whether the mouse has entered the canvas at least once */
  mouseActive: boolean;
  /** Whether the mouse is currently pressed */
  mouseDown: boolean;
  /** Mouse drag delta this frame */
  dragDeltaX: number;
  dragDeltaY: number;
  /** Scroll delta this frame (consumed after read) */
  scrollDelta: number;
  /** Tile click event (consumed after read) */
  clicked: boolean;
  clickScreenX: number;
  clickScreenY: number;
}

export class InputManager {
  private state: InputState = {
    keys: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseActive: false,
    mouseDown: false,
    dragDeltaX: 0,
    dragDeltaY: 0,
    scrollDelta: 0,
    clicked: false,
    clickScreenX: 0,
    clickScreenY: 0,
  };

  private lastMouseX = 0;
  private lastMouseY = 0;
  private dragStartX = 0;
  private dragStartY = 0;
  private isDragging = false;
  private readonly dragThreshold = 5;

  constructor(canvas: HTMLCanvasElement) {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.state.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => {
      this.state.keys.delete(e.key.toLowerCase());
    });

    // Mouse move
    canvas.addEventListener('mousemove', (e) => {
      this.state.mouseActive = true;
      this.state.mouseX = e.clientX;
      this.state.mouseY = e.clientY;

      if (this.state.mouseDown) {
        this.state.dragDeltaX += e.clientX - this.lastMouseX;
        this.state.dragDeltaY += e.clientY - this.lastMouseY;

        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;
        if (Math.sqrt(dx * dx + dy * dy) > this.dragThreshold) {
          this.isDragging = true;
        }
      }

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    // Mouse down
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.state.mouseDown = true;
        this.isDragging = false;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    // Mouse up — register click only if not dragging
    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.state.mouseDown = false;
        if (!this.isDragging) {
          this.state.clicked = true;
          this.state.clickScreenX = e.clientX;
          this.state.clickScreenY = e.clientY;
        }
        this.isDragging = false;
      }
    });

    // Scroll (zoom)
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.state.scrollDelta += e.deltaY;
    }, { passive: false });

    // Prevent context menu on right click
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Get the current input state. Call once per frame. */
  getState(): Readonly<InputState> {
    return this.state;
  }

  /** Check if a key is currently pressed */
  isKeyDown(key: string): boolean {
    return this.state.keys.has(key.toLowerCase());
  }

  /** Consume the click event (call after processing) */
  consumeClick(): void {
    this.state.clicked = false;
  }

  /** Consume the scroll delta (call after processing) */
  consumeScroll(): number {
    const delta = this.state.scrollDelta;
    this.state.scrollDelta = 0;
    return delta;
  }

  /** Consume drag deltas (call after processing) */
  consumeDrag(): { dx: number; dy: number } {
    const dx = this.state.dragDeltaX;
    const dy = this.state.dragDeltaY;
    this.state.dragDeltaX = 0;
    this.state.dragDeltaY = 0;
    return { dx, dy };
  }
}
