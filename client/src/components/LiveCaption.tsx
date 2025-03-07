import React, { useEffect, useRef, useState } from 'react';
import { useAudioContext } from '../hooks/useAudioContext';

// Add TypeScript declarations for the Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
    webkitAudioContext: typeof AudioContext;
  }
}

interface LiveCaptionProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  isEnabled: boolean;
  isDarkMode: boolean;
}

interface TranscriptionMessage {
  type: 'transcription' | 'partial' | 'error' | 'connection_established';
  text?: string;
  message?: string;
}

const BACKEND_WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//localhost:8000/ws/transcribe/`;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 2000; // 2 seconds

const LiveCaption: React.FC<LiveCaptionProps> = ({ audioRef, isEnabled, isDarkMode }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState<string>('');
  const [partialText, setPartialText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const { sourceNode, audioContext } = useAudioContext(audioRef.current);

  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      console.log('Attempting to connect WebSocket...');
      const ws = new WebSocket(BACKEND_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as TranscriptionMessage;
          console.log('Received WebSocket message:', data);
          
          if (data.type === 'error') {
            console.error('Server error:', data.message);
            setError(data.message || 'Unknown error');
            return;
          }
          
          if (data.type === 'connection_established') {
            console.log('Server ready:', data.message);
            return;
          }

          if (data.type === 'transcription' && typeof data.text === 'string') {
            const trimmedText = data.text.trim();
            if (trimmedText) {
              setTranscriptionText(prev => prev + ' ' + trimmedText);
              setPartialText('');
              setIsProcessing(false);
            }
          } else if (data.type === 'partial' && typeof data.text === 'string') {
            const trimmedText = data.text.trim();
            if (trimmedText) {
              setPartialText(trimmedText);
              setIsProcessing(true);
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect if enabled and haven't exceeded max attempts
        if (isEnabled && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          console.log(`Attempting to reconnect (${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
          reconnectAttemptsRef.current++;
          setTimeout(connectWebSocket, RECONNECT_DELAY);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setError('Failed to connect after multiple attempts');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error occurred');
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setError('Failed to create WebSocket connection');
    }
  };

  // Handle WebSocket connection and audio processing
  useEffect(() => {
    if (!isEnabled || !sourceNode || !audioContext || !audioRef.current) {
      // Cleanup when disabled
      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
        workletNodeRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      setIsProcessing(false);
      setError(null);
      return;
    }

    let isSetupComplete = false;

    const setupAudioProcessing = async () => {
      try {
        // First establish WebSocket connection
        connectWebSocket();

        // Load and register the audio worklet
        console.log('Loading audio worklet...');
        await audioContext.audioWorklet.addModule('/audioProcessor.js');
        console.log('Audio worklet loaded successfully');
        
        // Create audio worklet node
        const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
        workletNodeRef.current = workletNode;

        // Connect the audio nodes
        sourceNode.connect(workletNode);
        workletNode.connect(audioContext.destination);

        // Handle audio data from worklet
        workletNode.port.onmessage = (event) => {
          if (event.data.type === 'audio-data' && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(event.data.audioData.buffer);
            setIsProcessing(true);
          }
        };

        isSetupComplete = true;
        console.log('Audio processing setup complete');
      } catch (error) {
        console.error('Error setting up audio processing:', error);
        setError('Failed to initialize audio processing');
      }
    };

    setupAudioProcessing();

    // Cleanup function
    return () => {
      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
        workletNodeRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (isSetupComplete) {
        setTranscriptionText('');
        setPartialText('');
      }
      setError(null);
    };
  }, [isEnabled, sourceNode, audioContext]);

  // Reset transcription text when disabled
  useEffect(() => {
    if (!isEnabled) {
      setTranscriptionText('');
      setPartialText('');
      setError(null);
    }
  }, [isEnabled]);

  if (!isEnabled) return null;

  return (
    <div className={` ${
      isDarkMode ? 'bg-gray-800' : 'bg-white'
    } shadow-lg`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`flex items-center gap-2 ${
          isDarkMode ? 'text-gray-300' : 'text-gray-700'
        }`}>
          <span className={`inline-block w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
        {isConnected && (
          <>
            <span className="mx-2">•</span>
            <div className={`flex items-center gap-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <span className={`inline-block w-2 h-2 rounded-full ${
                isProcessing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
              }`} />
              {isProcessing ? 'Processing' : 'Ready'}
            </div>
          </>
        )}
      </div>
      {error && (
        <div className={`mt-2 p-2 rounded ${
          isDarkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-100 text-red-700'
        }`}>
          {error}
        </div>
      )}
      <div className={`mt-4 p-3 rounded ${
        isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
      } max-h-[200px] overflow-y-auto`}>
        <p className={
          isDarkMode ? 'text-gray-300' : 'text-gray-700'
        }>
          {transcriptionText}
          {partialText && (
            <span className="text-gray-400 italic"> {partialText}</span>
          )}
          {!transcriptionText && !partialText && 'Waiting for speech...'}
        </p>
      </div>
    </div>
  );
};

export default LiveCaption; 