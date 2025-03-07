// Audio Worklet Processor for handling audio data
class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 2048; // Match with Vosk's expected size
        this.sampleRate = 16000; // Vosk expects 16kHz
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
        this.resamplingFactor = 48000 / this.sampleRate; // Assuming input is 48kHz
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || !input[0]) return true;

        const inputData = input[0];
        
        // Process each input sample
        for (let i = 0; i < inputData.length; i++) {
            // Only process every nth sample based on resampling factor
            if (i % this.resamplingFactor < 1) {
                if (this.bufferIndex < this.bufferSize) {
                    // Ensure the sample is in [-1, 1] range
                    const sample = Math.max(-1, Math.min(1, inputData[i]));
                    this.buffer[this.bufferIndex++] = sample;
                }

                // When buffer is full, send it
                if (this.bufferIndex >= this.bufferSize) {
                    // Create a copy of the buffer to send
                    const audioData = this.buffer.slice();
                    
                    // Send the buffer to the main thread
                    this.port.postMessage({
                        type: 'audio-data',
                        audioData: audioData
                    });

                    // Reset buffer
                    this.bufferIndex = 0;
                }
            }
        }

        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor); 