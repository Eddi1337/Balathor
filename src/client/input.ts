// Keyboard, mouse and touch input. Movement is reported camera-relative; the caller converts it
// to world space using the camera yaw.

export interface InputSnapshot {
  /** -1..1 strafe (right +) and forward (+). */
  ix: number;
  iy: number;
  attackHeld: boolean;
}

export class Input {
  private keys = new Set<string>();
  private joy = { x: 0, y: 0, active: false, id: -1 };
  mouseX = 0;
  mouseY = 0;
  mouseDown = false;
  rightDrag = false;
  dragDX = 0;
  dragDY = 0;
  wheel = 0;
  touchMode = false;
  touchAttack = false;
  /** Fired on discrete key presses (not while typing). */
  onKey: (code: string, e: KeyboardEvent) => void = () => {};
  onClickWorld: (x: number, y: number, button: number) => void = () => {};

  constructor(private canvas: HTMLCanvasElement) {
    addEventListener("keydown", (e) => {
      if (isTyping(e)) return;
      if (!e.repeat) this.onKey(e.code, e);
      this.keys.add(e.code);
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(e.code)) e.preventDefault();
    });
    addEventListener("keyup", (e) => this.keys.delete(e.code));
    addEventListener("blur", () => {
      this.keys.clear();
      this.mouseDown = false;
      this.rightDrag = false;
    });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch") return;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      if (e.button === 2) {
        this.rightDrag = true;
        canvas.setPointerCapture(e.pointerId);
      } else if (e.button === 0) {
        this.mouseDown = true;
        this.onClickWorld(e.clientX, e.clientY, 0);
      }
    });
    addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") return;
      if (this.rightDrag) {
        this.dragDX += e.movementX;
        this.dragDY += e.movementY;
      }
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });
    addEventListener("pointerup", (e) => {
      if (e.button === 2) this.rightDrag = false;
      if (e.button === 0) this.mouseDown = false;
    });
    canvas.addEventListener("wheel", (e) => {
      this.wheel += Math.sign(e.deltaY);
      e.preventDefault();
    }, { passive: false });
    this.setupTouch();
  }

  private setupTouch(): void {
    const stick = document.getElementById("joystick")!;
    const knob = document.getElementById("joystick-knob")!;
    const controls = document.getElementById("touch-controls")!;
    const enable = () => {
      if (this.touchMode) return;
      this.touchMode = true;
      controls.classList.remove("hidden");
    };
    addEventListener("touchstart", enable, { once: true, passive: true });
    const move = (t: Touch) => {
      const r = stick.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      let dx = (t.clientX - cx) / (r.width / 2);
      let dy = (t.clientY - cy) / (r.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > 1) {
        dx /= len;
        dy /= len;
      }
      this.joy.x = dx;
      this.joy.y = dy;
      knob.style.transform = `translate(${dx * 36}px, ${dy * 36}px)`;
    };
    stick.addEventListener("touchstart", (e) => {
      const t = e.changedTouches[0];
      this.joy.active = true;
      this.joy.id = t.identifier;
      move(t);
      e.preventDefault();
    }, { passive: false });
    stick.addEventListener("touchmove", (e) => {
      for (const t of Array.from(e.changedTouches)) if (t.identifier === this.joy.id) move(t);
      e.preventDefault();
    }, { passive: false });
    const end = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === this.joy.id) {
          this.joy = { x: 0, y: 0, active: false, id: -1 };
          knob.style.transform = "";
        }
      }
    };
    stick.addEventListener("touchend", end);
    stick.addEventListener("touchcancel", end);
    const atk = document.getElementById("touch-attack")!;
    atk.addEventListener("touchstart", (e) => {
      this.touchAttack = true;
      e.preventDefault();
    }, { passive: false });
    atk.addEventListener("touchend", () => (this.touchAttack = false));
    // One-finger drag on the scene rotates the camera.
    let last: { x: number; y: number; id: number } | null = null;
    this.canvas.addEventListener("touchstart", (e) => {
      const t = e.changedTouches[0];
      last = { x: t.clientX, y: t.clientY, id: t.identifier };
    }, { passive: true });
    this.canvas.addEventListener("touchmove", (e) => {
      for (const t of Array.from(e.changedTouches)) {
        if (last && t.identifier === last.id) {
          this.dragDX += t.clientX - last.x;
          this.dragDY += t.clientY - last.y;
          last.x = t.clientX;
          last.y = t.clientY;
        }
      }
    }, { passive: true });
    this.canvas.addEventListener("touchend", (e) => {
      const t = e.changedTouches[0];
      if (last && t.identifier === last.id && Math.abs(t.clientX - last.x) < 4) this.onClickWorld(t.clientX, t.clientY, 0);
      last = null;
    });
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  sample(): InputSnapshot {
    let ix = 0;
    let iy = 0;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) iy += 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) iy -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) ix += 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) ix -= 1;
    if (this.joy.active) {
      ix = this.joy.x;
      iy = -this.joy.y;
    }
    const len = Math.hypot(ix, iy);
    if (len > 1) {
      ix /= len;
      iy /= len;
    }
    return { ix, iy, attackHeld: this.keys.has("Space") || this.mouseDown || this.touchAttack };
  }

  consumeDrag(): { dx: number; dy: number; wheel: number } {
    const out = { dx: this.dragDX, dy: this.dragDY, wheel: this.wheel };
    this.dragDX = 0;
    this.dragDY = 0;
    this.wheel = 0;
    return out;
  }
}

export function isTyping(e: Event): boolean {
  const t = e.target as HTMLElement | null;
  return Boolean(t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable));
}
