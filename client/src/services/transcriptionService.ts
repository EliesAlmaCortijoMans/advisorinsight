import EventEmitter from 'events';
import { Socket } from 'socket.io-client';
import io from 'socket.io-client';

interface TranscriptionSegment {
  text: string;
  timestamp: number;
}

interface TranscriptionEvents {
  connected: () => void;
  disconnected: () => void;
  transcription: (segments: TranscriptionSegment[]) => void;
  error: (error: Error) => void;
}

class TranscriptionService extends EventEmitter {
  private socket: ReturnType<typeof io> | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 1000;
  private connectionPromise: Promise<void> | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private gainNode: GainNode | null = null;
  private isTranscribing = false;
  private isWorkletLoaded = false;
  private currentAudioElement: HTMLAudioElement | null = null;

  constructor(private socketUrl: string = 'https://backend-production-2463.up.railway.app') {
    super();
  }

  private async loadAudioWorklet() {
    if (!this.audioContext || this.isWorkletLoaded) return;

    try {
      const workletUrl = new URL('./audio-processor.worklet.js', import.meta.url);
      await this.audioContext.audioWorklet.addModule(workletUrl.href);
      this.isWorkletLoaded = true;
    } catch (error) {
      console.error('Failed to load audio worklet:', error);
      throw error;
    }
  }

  private async setupAudioContext() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    if (!this.isWorkletLoaded) {
      await this.loadAudioWorklet();
    }
  }

  private async setupAudioNodes(audioElement: HTMLAudioElement) {
    // If we're already connected to this audio element, just reconnect the nodes
    if (this.currentAudioElement === audioElement && this.sourceNode) {
      this.workletNode = new AudioWorkletNode(this.audioContext!, 'audio-capture-processor');
      this.gainNode = this.audioContext!.createGain();
      
      this.sourceNode.connect(this.workletNode);
      this.workletNode.connect(this.gainNode);
      this.gainNode.connect(this.audioContext!.destination);
      return;
    }

    // Clean up existing nodes if we're switching to a new audio element
    if (this.currentAudioElement !== audioElement) {
      await this.cleanupAudioNodes();
      this.sourceNode = this.audioContext!.createMediaElementSource(audioElement);
      this.currentAudioElement = audioElement;
    }

    this.workletNode = new AudioWorkletNode(this.audioContext!, 'audio-capture-processor');
    this.gainNode = this.audioContext!.createGain();

    this.sourceNode!.connect(this.workletNode!);
    this.workletNode!.connect(this.gainNode!);
    this.gainNode!.connect(this.audioContext!.destination);
  }

  private async cleanupAudioNodes() {
    if (this.workletNode) {
      this.workletNode.port.postMessage({ isCapturing: false });
      this.workletNode.port.onmessage = null;
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    // Don't disconnect the source node if we're keeping the same audio element
    if (this.sourceNode && this.currentAudioElement !== this.currentAudioElement) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
  }

  on<K extends keyof TranscriptionEvents>(event: K, listener: TranscriptionEvents[K]): this {
    return super.on(event, listener);
  }

  emit<K extends keyof TranscriptionEvents>(event: K, ...args: Parameters<TranscriptionEvents[K]>): boolean {
    return super.emit(event, ...args);
  }

  removeListener<K extends keyof TranscriptionEvents>(event: K, listener: TranscriptionEvents[K]): this {
    return super.removeListener(event, listener);
  }

  async connect(): Promise<void> {
    if (this.isConnected && this.socket?.connected) {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.socket = io(this.socketUrl, {
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000
        });

        this.socket.on('connect', () => {
          console.log('Transcription Socket.IO connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('connected');
          resolve();
        });

        this.socket.on('disconnect', () => {
          console.log('Transcription Socket.IO disconnected');
          this.isConnected = false;
          this.emit('disconnected');
          this.connectionPromise = null;
        });

        this.socket.on('connect_error', (error: Error) => {
          console.error('Socket.IO connection error:', error);
          this.emit('error', error);
        });

        this.socket.on('error', (error: Error) => {
          console.error('Transcription Socket.IO error:', error);
          this.emit('error', error);
        });

        this.socket.on('transcription', (data: { segments: TranscriptionSegment[] }) => {
          this.emit('transcription', data.segments);
        });

      } catch (error) {
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  async startTranscription(audioElement: HTMLAudioElement): Promise<void> {
    if (!this.isConnected || !this.socket?.connected) {
      try {
        await this.connect();
      } catch (error) {
        throw new Error('Failed to establish Socket.IO connection');
      }
    }

    try {
      await this.setupAudioContext();
      await this.setupAudioNodes(audioElement);

      // Handle audio processing messages from worklet
      this.workletNode!.port.onmessage = (event) => {
        if (this.isTranscribing && event.data.audio) {
          this.socket?.emit('audio_data', {
            audio: event.data.audio,
            timestamp: audioElement.currentTime
          });
        }
      };

      // Start capturing
      this.workletNode!.port.postMessage({ isCapturing: true });
      this.isTranscribing = true;
      console.log('Started audio capture for transcription');

    } catch (error) {
      console.error('Error setting up audio capture:', error);
      // Clean up on error
      await this.stopTranscription();
      throw error;
    }
  }

  async stopTranscription(): Promise<void> {
    this.isTranscribing = false;
    await this.cleanupAudioNodes();
    console.log('Stopped audio capture');
  }

  disconnect() {
    this.stopTranscription();
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
      this.isWorkletLoaded = false;
    }

    this.currentAudioElement = null;

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.connectionPromise = null;
    }
  }

  isWebSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected || false;
  }
}

// Export a singleton instance
export const transcriptionService = new TranscriptionService();
export type { TranscriptionSegment }; 