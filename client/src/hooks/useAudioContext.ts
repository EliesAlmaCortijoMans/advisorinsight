import { useRef, useEffect } from 'react';

// Singleton AudioContext manager
class AudioContextManager {
  private static instance: AudioContextManager;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private currentElement: HTMLAudioElement | null = null;

  private constructor() {}

  static getInstance(): AudioContextManager {
    if (!AudioContextManager.instance) {
      AudioContextManager.instance = new AudioContextManager();
    }
    return AudioContextManager.instance;
  }

  async setupAudioElement(element: HTMLAudioElement | null) {
    if (!element) {
      this.cleanup();
      return null;
    }

    // If this is the same element we already have set up, return existing nodes
    if (element === this.currentElement && this.sourceNode && this.audioContext) {
      return {
        audioContext: this.audioContext,
        sourceNode: this.sourceNode
      };
    }

    // Cleanup previous setup
    this.cleanup();

    try {
      // Create new audio context if needed
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      // Create and connect new source node
      this.sourceNode = this.audioContext.createMediaElementSource(element);
      this.sourceNode.connect(this.audioContext.destination);
      this.currentElement = element;

      console.log('Audio context and source node initialized successfully');
      return {
        audioContext: this.audioContext,
        sourceNode: this.sourceNode
      };
    } catch (error) {
      console.error('Error initializing audio context:', error);
      this.cleanup();
      return null;
    }
  }

  private cleanup() {
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (error) {
        console.error('Error disconnecting source node:', error);
      }
      this.sourceNode = null;
    }
    this.currentElement = null;
  }

  getAudioContext() {
    return this.audioContext;
  }
}

export const useAudioContext = (audioElement: HTMLAudioElement | null) => {
  const stateRef = useRef<{
    audioContext: AudioContext | null;
    sourceNode: MediaElementAudioSourceNode | null;
  }>({
    audioContext: null,
    sourceNode: null
  });

  useEffect(() => {
    const manager = AudioContextManager.getInstance();
    
    const setupAudio = async () => {
      const result = await manager.setupAudioElement(audioElement);
      if (result) {
        stateRef.current = result;
      } else {
        stateRef.current = { audioContext: null, sourceNode: null };
      }
    };

    setupAudio();
  }, [audioElement]);

  return stateRef.current;
}; 