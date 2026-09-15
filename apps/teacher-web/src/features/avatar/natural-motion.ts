import type { AvatarCueState } from "@edu/contracts";

const ease = (value: number) => (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, value)))) / 2;
/** Quiet, elapsed-time-driven motion. New dialogue states blend instead of snapping. */
export class NaturalAvatarMotion {
  private time = 0;
  private state: AvatarCueState = "idle";
  private stateAt = 0;
  private nextBlink = 3.2 + Math.random() * 1.8;
  private blinkAt = -10;
  private nextGlance = 10 + Math.random() * 8;
  private glanceAt = -10;
  private glanceX = 0;
  private x = -0.8;
  private y = 0.6;
  private z = -0.7;
  private smile = 0.25;
  private brow = 0.04;

  update(dt: number, state: AvatarCueState, reduced: boolean) {
    this.time += Math.max(0, Math.min(dt, 0.05));
    if (state !== this.state) { this.state = state; this.stateAt = this.time; }
    if (this.time >= this.nextBlink) {
      this.blinkAt = this.time;
      this.nextBlink = this.time + 3.4 + Math.random() * 3.2;
    }
    if (this.time >= this.nextGlance) {
      this.glanceAt = this.time;
      this.glanceX = (Math.random() < 0.5 ? -1 : 1) * (0.06 + Math.random() * 0.04);
      this.nextGlance = this.time + 12 + Math.random() * 10;
    }
    const blinkTime = this.time - this.blinkAt;
    const blink = blinkTime < 0.08 ? ease(blinkTime / 0.08) : blinkTime < 0.11 ? 1 : 1 - ease((blinkTime - 0.11) / 0.14);
    const glanceTime = this.time - this.glanceAt;
    const glance = glanceTime < 2 ? Math.sin(Math.PI * glanceTime / 2) ** 2 * this.glanceX : 0;
    const sinceState = this.time - this.stateAt;
    const nod = state === "affirming" && sinceState < 1.1 ? Math.sin(Math.PI * sinceState / 1.1) ** 2 * 1.8 : 0;
    const targetX = state === "thinking" ? -3 : state === "listening" ? 0.8 : -0.8;
    const targetY = (state === "listening" ? 1.6 : state === "thinking" ? 0.8 : 0.6) - nod;
    const targetZ = state === "thinking" ? -1.6 : state === "listening" ? 0.4 : -0.7;
    const weight = 1 - Math.exp(-dt / 0.45);
    this.x += (targetX - this.x) * weight;
    this.y += (targetY - this.y) * weight;
    this.z += (targetZ - this.z) * weight;
    this.smile += ((state === "affirming" ? 0.45 : 0.25) - this.smile) * weight;
    this.brow += ((state === "listening" ? 0.12 : 0.04) - this.brow) * weight;
    return {
      eyeOpen: reduced ? 1 : 1 - blink,
      eyeX: reduced ? 0 : glance,
      x: reduced ? -0.8 : this.x + glance * 2,
      y: reduced ? 0.6 : this.y,
      z: reduced ? -0.7 : this.z,
      breath: reduced ? 0.25 : 0.25 + 0.10 * Math.sin(this.time * Math.PI * 2 / 5.8),
      smile: this.smile,
      brow: this.brow
    };
  }
}
