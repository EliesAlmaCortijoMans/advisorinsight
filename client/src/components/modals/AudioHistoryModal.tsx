import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Play, Pause, Calendar, Volume2, VolumeX, Subtitles } from 'lucide-react';

interface AudioFile {
  id: string;
  title: string;
  time: string;
  audioUrl: string;
  audioAvailable: boolean;
}

interface AudioHistoryModalProps {
  onClose: () => void;
  audioHistory: AudioFile[];
}

// Add type declaration for captureStream
declare global {
  interface HTMLAudioElement {
    captureStream(): MediaStream;
  }
}

const AudioHistoryModal: React.FC<AudioHistoryModalProps> = ({ onClose, audioHistory }) => {
  const [selectedAudio, setSelectedAudio] = useState<AudioFile | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const lastErrorRef = useRef<string | null>(null);
  const [showCaptions, setShowCaptions] = useState(false);
  const [captions, setCaptions] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Helper function to ensure audio URL is properly formatted
  const getFullAudioUrl = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // Use the backend server URL
    return `http://localhost:8000${url.startsWith('/') ? url : `/${url}`}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (timeInSeconds: number) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlay = async (audio: AudioFile) => {
    if (!audio.audioAvailable) {
      alert('Audio file is not available yet');
      return;
    }

    try {
      if (selectedAudio?.id === audio.id) {
        if (isPlaying) {
          audioRef.current?.pause();
        } else {
          const playPromise = audioRef.current?.play();
          if (playPromise) {
            await playPromise;
          }
        }
        setIsPlaying(!isPlaying);
      } else {
        setSelectedAudio(audio);
        setIsPlaying(true);
        setError(null);
        setCurrentTime(0);
      }
    } catch (err) {
      console.error('Error playing audio:', err);
      setError('Failed to play audio file');
    }
  };

  const handlePlayPauseButton = async () => {
    if (!selectedAudio || !audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise) {
          await playPromise;
        }
      }
      setIsPlaying(!isPlaying);
    } catch (err) {
      console.error('Error toggling play/pause:', err);
      setError('Failed to play audio file');
    }
  };

  const handleTimelineChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    audioRef.current.currentTime = newTime;
  }, []);

  const handleTimelineMouseDown = useCallback(() => {
    setIsSeeking(true);
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  const handleTimelineMouseUp = useCallback(() => {
    setIsSeeking(false);
    if (isPlaying && audioRef.current) {
      audioRef.current.play();
    }
  }, [isPlaying]);

  const cleanupAudioProcessing = useCallback(() => {
    try {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      mediaRecorderRef.current = null;
      audioContextRef.current = null;
      wsRef.current = null;
    } catch (err) {
      console.error('Error during cleanup:', err);
    }
  }, []);

  const setupAudioProcessing = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      // Create audio context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Get the audio stream directly from the audio element
      const stream = audioRef.current.captureStream();
      
      // Check supported MIME types
      const mimeType = 'audio/webm;codecs=opus';  // Stick with WebM as it's most reliable
      console.log('Using MIME type:', mimeType);
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        bitsPerSecond: 128000
      });

      // Set up WebSocket connection
      wsRef.current = new WebSocket('ws://localhost:8000/ws/transcribe/');
      
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'transcription') {
          // Only add new text if it's not already in the captions
          setCaptions(prev => {
            const newText = data.text.trim();
            // If the previous text ends with the new text, don't add it
            if (prev.endsWith(newText)) {
              return prev;
            }
            // If the new text contains part of the previous text, remove the overlap
            const overlap = findOverlap(prev, newText);
            if (overlap) {
              return prev + newText.slice(overlap.length);
            }
            // Otherwise, add with a space
            return prev + (prev ? ' ' : '') + newText;
          });
        } else if (data.type === 'error') {
          console.error('Transcription error:', data.message);
          if (data.message.includes('Invalid file format')) {
            cleanupAudioProcessing();
            setError('Transcription format error - restarting captions...');
            // Restart the audio processing after a short delay
            setTimeout(() => {
              setupAudioProcessing();
            }, 1000);
          } else {
            setError('Error processing audio. Trying to continue...');
          }
        }
      };

      // Add helper function to find text overlap
      const findOverlap = (str1: string, str2: string): string => {
        if (!str1 || !str2) return '';
        let overlap = '';
        const minLength = Math.min(str1.length, str2.length);
        for (let i = 1; i <= minLength; i++) {
          const end = str1.slice(-i);
          const start = str2.slice(0, i);
          if (end === start) {
            overlap = end;
          }
        }
        return overlap;
      };

      // Handle audio chunks
      let chunks: Blob[] = [];
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          try {
            // Create a new blob with explicit WebM type
            const audioBlob = new Blob([event.data], { type: 'audio/webm' });
            
            // Convert to base64
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64data = (reader.result as string)?.split(',')[1];
              if (base64data && wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                  type: 'audio_chunk',
                  chunk: base64data
                }));
              }
            };
            reader.readAsDataURL(audioBlob);
          } catch (err) {
            console.error('Error processing audio chunk:', err);
          }
        }
      };

      // Start recording in 3-second chunks
      mediaRecorder.start(3000);
      mediaRecorderRef.current = mediaRecorder;

    } catch (err) {
      console.error('Error setting up audio processing:', err);
      setError('Failed to set up live captions');
      setShowCaptions(false);
    }
  }, [cleanupAudioProcessing]);

  const toggleCaptions = async () => {
    try {
      if (showCaptions) {
        // If turning off captions
        cleanupAudioProcessing();
        setCaptions('');
        setShowCaptions(false);
      } else {
        // If turning on captions
        setShowCaptions(true);
        setIsTranscribing(true);
        setError(null);  // Clear any previous errors
        await setupAudioProcessing();
        setIsTranscribing(false);
      }
    } catch (err) {
      console.error('Error toggling captions:', err);
      setError('Failed to toggle captions');
      setShowCaptions(false);
    }
  };

  // Add effect to handle audio context setup when playing changes
  useEffect(() => {
    if (isPlaying && showCaptions && !audioContextRef.current) {
      setupAudioProcessing();
    }
  }, [isPlaying, showCaptions, setupAudioProcessing]);

  useEffect(() => {
    return () => {
      cleanupAudioProcessing();
    };
  }, [cleanupAudioProcessing]);

  // Update the useEffect to ensure audio is properly loaded
  useEffect(() => {
    if (selectedAudio) {
      const loadAudio = async () => {
        if (audioRef.current) {
          try {
            // Reset states
            setCurrentTime(0);
            setDuration(0);
            setError(null);

            // Set new source with properly formatted URL
            audioRef.current.src = getFullAudioUrl(selectedAudio.audioUrl);
            audioRef.current.load();
            audioRef.current.volume = volume;

            // Wait for metadata to load
            await new Promise((resolve) => {
              audioRef.current!.addEventListener('loadedmetadata', resolve, { once: true });
            });

            // Set initial duration
            setDuration(audioRef.current.duration);

            // Start playing if needed
            if (isPlaying) {
              await audioRef.current.play();
            }
          } catch (err) {
            console.error('Error loading audio:', err);
            setError('Failed to load audio');
          }
        }
      };

      loadAudio();
    }
  }, [selectedAudio]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-11/12 max-w-7xl h-[80vh] flex overflow-hidden">
        {/* Sidebar with audio list */}
        <div className="w-64 border-r border-gray-200 bg-gray-50 p-4 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">Available Recordings</h3>
          <div className="space-y-2">
            {audioHistory.map((audio) => (
              <button
                key={audio.id}
                onClick={() => handlePlay(audio)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedAudio?.id === audio.id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'hover:bg-gray-100'
                }`}
                disabled={!audio.audioAvailable}
              >
                <div className="font-medium">{audio.title || 'Earnings Call'}</div>
                {audio.time && (
                  <div className="text-sm text-gray-500 flex items-center mt-1">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(audio.time)}
                  </div>
                )}
                {!audio.audioAvailable && (
                  <div className="text-xs text-red-500 mt-1">
                    Audio not available
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900">
              {selectedAudio ? selectedAudio.title : 'Select a Recording'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 flex flex-col">
            {/* Audio player area */}
            <div className="flex-1 p-6 flex flex-col">
              {selectedAudio ? (
                <>
                  <div className="flex-1 flex flex-col">
                    <div className="text-center w-full mb-4">
                      <div className="bg-gray-100 rounded-lg p-8">
                        <div className="h-32 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <span className="text-indigo-600">
                            {isPlaying ? 'Now Playing' : 'Ready to Play'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Captions area */}
                    {showCaptions && (
                      <div className="mb-4 p-4 bg-gray-50 rounded-lg max-h-48 overflow-y-auto">
                        {isTranscribing ? (
                          <div className="text-center text-gray-500">
                            Generating captions...
                          </div>
                        ) : (
                          <p className="text-gray-700 whitespace-pre-wrap">
                            {captions || 'No captions available'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Audio controls */}
                  <div className="mt-auto">
                    {/* Timeline */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-500 mb-1">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                      <div className="relative h-2">
                        <input
                          type="range"
                          min="0"
                          max={duration || 100}
                          step="1"
                          value={currentTime}
                          onChange={handleTimelineChange}
                          onMouseDown={handleTimelineMouseDown}
                          onMouseUp={handleTimelineMouseUp}
                          onTouchStart={handleTimelineMouseDown}
                          onTouchEnd={handleTimelineMouseUp}
                          className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="absolute w-full h-full bg-gray-200 rounded-full">
                          <div 
                            className="h-full bg-indigo-600 rounded-full"
                            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Playback controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={handlePlayPauseButton}
                          className="p-2 rounded-full hover:bg-gray-100"
                        >
                          {isPlaying ? (
                            <Pause className="w-6 h-6 text-gray-700" />
                          ) : (
                            <Play className="w-6 h-6 text-gray-700" />
                          )}
                        </button>

                        {/* Caption toggle button */}
                        <button
                          onClick={toggleCaptions}
                          className={`p-2 rounded-full hover:bg-gray-100 ${
                            showCaptions ? 'bg-indigo-100 text-indigo-600' : 'text-gray-700'
                          }`}
                        >
                          <Subtitles className="w-6 h-6" />
                        </button>
                      </div>
                      
                      {/* Volume control */}
                      <div className="flex items-center space-x-2" style={{ width: '120px' }}>
                        <button
                          onClick={() => {
                            setIsMuted(!isMuted);
                            if (audioRef.current) {
                              audioRef.current.volume = isMuted ? volume : 0;
                            }
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {isMuted ? (
                            <VolumeX className="w-4 h-4 text-gray-500" />
                          ) : (
                            <Volume2 className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                        <div className="relative flex-1 h-1">
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={isMuted ? 0 : volume}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              setVolume(value);
                              setIsMuted(value === 0);
                              if (audioRef.current) {
                                audioRef.current.volume = value;
                              }
                            }}
                            className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <div className="absolute w-full h-full bg-gray-200 rounded-full">
                            <div 
                              className="h-full bg-indigo-600 rounded-full"
                              style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  Select an earnings call recording from the sidebar to listen
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current && !isSeeking) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
          }
        }}
        onError={(e) => {
          const error = audioRef.current?.error;
          const errorMessage = error?.message || 'Unknown error';
          
          if (lastErrorRef.current !== errorMessage) {
            lastErrorRef.current = errorMessage;
            console.error('Audio error:', {
              code: error?.code,
              message: errorMessage,
              src: audioRef.current?.src
            });
            setError(`Error loading audio file: ${errorMessage}`);
          }
        }}
        crossOrigin="anonymous"
        preload="metadata"
      />
    </div>
  );
};

export default AudioHistoryModal; 