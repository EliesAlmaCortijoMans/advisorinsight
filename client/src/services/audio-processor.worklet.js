class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.isCapturing = false;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const channel = input[0];

    if (channel && this.isCapturing) {
      // Convert Float32Array to Int16Array for better compression
      const audioData = new Int16Array(channel.length);
      for (let i = 0; i < channel.length; i++) {
        audioData[i] = Math.max(-32768, Math.min(32767, channel[i] * 32768));
      }

      // Send audio data to main thread
      this.port.postMessage({
        audio: Array.from(audioData)
      });
    }

    return true;
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor); 