// No playback: the zero-filled output keeps this processor active without microphone feedback.
class ClassroomMicrophone extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frame = new Float32Array(2048);
    this.offset = 0;
  }
  process(inputs) {
    const channels = inputs[0];
    if (!channels?.length) return true;
    for (let index = 0; index < channels[0].length; index++) {
      let value = 0;
      for (const channel of channels) value += channel[index];
      this.frame[this.offset++] = value / channels.length;
      if (this.offset === this.frame.length) {
        this.port.postMessage(this.frame, [this.frame.buffer]);
        this.frame = new Float32Array(2048);
        this.offset = 0;
      }
    }
    return true;
  }
}
registerProcessor("classroom-microphone", ClassroomMicrophone);
