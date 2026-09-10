/* Pure audio-clock state machine. Silence never ends a recording without a keyword. */
globalThis.ClassroomEndingGate = class {
  constructor(rate = 16000) {
    this.rate = rate;
    this.reset();
  }
  reset() {
    this.pending = false;
    this.elapsed = 0;
    this.silence = 0;
    this.waitingForTail = false;
  }
  begin(speaking) {
    if (this.pending) return;
    this.pending = true;
    this.elapsed = 0;
    this.silence = 0;
    // Allow a short detector tail from the keyword itself, never a whole new utterance.
    this.waitingForTail = speaking;
  }
  advance(samples, speaking) {
    if (!this.pending) return;
    this.elapsed += samples;
    if (speaking) {
      this.silence = 0;
      if (!this.waitingForTail || this.elapsed >= this.rate * 0.32) {
        this.reset();
        return 'resumed';
      }
    } else {
      this.waitingForTail = false;
      this.silence += samples;
      if (this.silence >= this.rate) {
        this.reset();
        return 'finish';
      }
    }
  }
};
