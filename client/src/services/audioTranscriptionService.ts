import { EventEmitter } from 'events';

type TranscriptionCallback = (segments: TranscriptionSegment[]) => void;
type AudioChunkCallback = (chunk: AudioChunk) => void;

interface TranscriptionSegment {
    text: string;
    timestamp: number;
}

interface AudioChunk {
    data: string;  // base64 encoded audio data
    size: number;
    timestamp: number;
    chunk_number: number;
}

export class AudioTranscriptionService {
    private static instance: AudioTranscriptionService;
    private socket: WebSocket | null = null;
    private eventEmitter: EventEmitter;
    private isConnected: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private currentStreamId: string | null = null;
    private connectionTimeout: number = 5000;
    private connectionTimer: number | null = null;
    private readonly WEBSOCKET_URL = 'wss://backend-production-2463.up.railway.app/ws/transcribe/';

    private constructor() {
        this.eventEmitter = new EventEmitter();
        this.eventEmitter.setMaxListeners(20);
    }

    static getInstance(): AudioTranscriptionService {
        if (!AudioTranscriptionService.instance) {
            AudioTranscriptionService.instance = new AudioTranscriptionService();
        }
        return AudioTranscriptionService.instance;
    }

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.socket?.readyState === WebSocket.OPEN) {
                console.log('WebSocket already connected');
                resolve();
                return;
            }

            if (this.connectionTimer) {
                clearTimeout(this.connectionTimer);
            }

            try {
                console.log('Attempting to connect to transcription service...');
                this.socket = new WebSocket(this.WEBSOCKET_URL);

                this.connectionTimer = window.setTimeout(() => {
                    if (this.socket?.readyState !== WebSocket.OPEN) {
                        console.error('Connection timeout');
                        this.socket?.close();
                        reject(new Error('Connection timeout'));
                        this.handleDisconnect();
                    }
                }, this.connectionTimeout);

                this.socket.onopen = () => {
                    console.log('Audio transcription WebSocket connected successfully');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    if (this.connectionTimer) {
                        clearTimeout(this.connectionTimer);
                    }
                    this.eventEmitter.emit('connected');
                    resolve();
                };

                this.socket.onclose = (event) => {
                    console.log('Audio transcription WebSocket disconnected:', {
                        code: event.code,
                        reason: event.reason,
                        wasClean: event.wasClean
                    });
                    this.isConnected = false;
                    if (this.connectionTimer) {
                        clearTimeout(this.connectionTimer);
                    }
                    this.handleDisconnect();
                    reject(new Error('WebSocket disconnected'));
                };

                this.socket.onerror = (error) => {
                    console.error('Audio transcription WebSocket error:', {
                        error,
                        readyState: this.socket?.readyState,
                        url: this.WEBSOCKET_URL
                    });
                    if (this.connectionTimer) {
                        clearTimeout(this.connectionTimer);
                    }
                    this.handleDisconnect();
                    reject(new Error('WebSocket error'));
                };

                this.socket.onmessage = (event) => {
                    this.handleMessage(event);
                };

            } catch (error) {
                console.error('Error creating WebSocket connection:', error);
                if (this.connectionTimer) {
                    clearTimeout(this.connectionTimer);
                }
                this.handleDisconnect();
                reject(error);
            }
        });
    }

    private handleMessage(event: MessageEvent) {
        try {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
                case 'transcription':
                    this.eventEmitter.emit('transcription', data.segments);
                    break;
                case 'audio_chunk':
                    this.eventEmitter.emit('audio_chunk', {
                        data: data.data,
                        size: data.size,
                        timestamp: data.timestamp,
                        chunk_number: data.chunk_number
                    });
                    break;
                case 'stream_start':
                    this.currentStreamId = data.stream_id;
                    this.eventEmitter.emit('stream_start', data);
                    break;
                case 'stream_end':
                    this.currentStreamId = null;
                    this.eventEmitter.emit('stream_end', data);
                    break;
                case 'error':
                    console.error('Transcription error:', data.message);
                    this.eventEmitter.emit('error', data.message);
                    break;
            }
        } catch (error) {
            console.error('Error handling transcription message:', error);
        }
    }

    private async handleDisconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
            console.log(`Reconnecting to transcription service (attempt ${this.reconnectAttempts}) in ${delay}ms...`);
            
            this.eventEmitter.emit('error', `Connection lost. Reconnecting (attempt ${this.reconnectAttempts})...`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            
            try {
                await this.connect();
                console.log('Reconnection successful');
                if (this.currentStreamId) {
                    await this.startStream(this.currentStreamId);
                }
            } catch (error) {
                console.error('Reconnection failed:', error);
            }
        } else {
            console.error('Max reconnection attempts reached for transcription service');
            this.eventEmitter.emit('error', 'Failed to connect to transcription service. Please check if the service is running and refresh the page.');
        }
    }

    async startStream(symbol: string) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }

            if (this.socket?.readyState === WebSocket.OPEN) {
                console.log('Starting stream for symbol:', symbol);
                this.socket.send(JSON.stringify({
                    type: 'start_stream',
                    symbol: symbol
                }));
            } else {
                throw new Error('WebSocket not connected');
            }
        } catch (error) {
            console.error('Error starting stream:', error);
            this.eventEmitter.emit('error', 'Failed to start audio stream. Please try again.');
            throw error;
        }
    }

    async sendAudioData(audioData: Float32Array) {
        if (!this.isConnected || !this.currentStreamId) {
            throw new Error('No active stream');
        }

        try {
            // Convert Float32Array to base64
            const buffer = new ArrayBuffer(audioData.length * 4);
            const view = new DataView(buffer);
            audioData.forEach((value, index) => {
                view.setFloat32(index * 4, value, true);
            });

            const base64Data = btoa(
                new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            );

            if (this.socket?.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    type: 'audio_data',
                    audio_data: base64Data
                }));
            }
        } catch (error) {
            console.error('Error sending audio data:', error);
            throw error;
        }
    }

    stopStream() {
        if (this.socket?.readyState === WebSocket.OPEN && this.currentStreamId) {
            console.log('Stopping stream:', this.currentStreamId);
            this.socket.send(JSON.stringify({
                type: 'stop_stream',
                stream_id: this.currentStreamId
            }));
            this.currentStreamId = null;
        }
    }

    onTranscription(callback: TranscriptionCallback) {
        this.eventEmitter.on('transcription', callback);
        return () => this.eventEmitter.off('transcription', callback);
    }

    onAudioChunk(callback: AudioChunkCallback) {
        this.eventEmitter.on('audio_chunk', callback);
        return () => this.eventEmitter.off('audio_chunk', callback);
    }

    onStreamStart(callback: (data: any) => void) {
        this.eventEmitter.on('stream_start', callback);
        return () => this.eventEmitter.off('stream_start', callback);
    }

    onStreamEnd(callback: (data: any) => void) {
        this.eventEmitter.on('stream_end', callback);
        return () => this.eventEmitter.off('stream_end', callback);
    }

    onError(callback: (error: string) => void) {
        this.eventEmitter.on('error', callback);
        return () => this.eventEmitter.off('error', callback);
    }

    disconnect() {
        console.log('Disconnecting from transcription service');
        if (this.connectionTimer) {
            clearTimeout(this.connectionTimer);
        }
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.isConnected = false;
        this.currentStreamId = null;
        this.eventEmitter.removeAllListeners();
    }
} 