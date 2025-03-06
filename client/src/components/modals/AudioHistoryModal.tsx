import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Play, Pause, Calendar, Volume2, VolumeX, Subtitles } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { isDarkMode } = useTheme();
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
        // Reset captions when changing audio
        if (showCaptions) {
          setCaptions('');
          cleanupAudioProcessing();
          await setupAudioProcessing();
        }
      }
    } catch (err) {
      console.error('Error playing audio:', err);
      // Don't set error message, just log it
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

    try {
      // Clean up any existing audio processing
      cleanupAudioProcessing();

      // Create audio context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Get the audio stream directly from the audio element
      const stream = audioRef.current.captureStream();
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        bitsPerSecond: 128000
      });

      // Set up WebSocket connection
      wsRef.current = new WebSocket('ws://localhost:8000/ws/transcribe/');
      
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'transcription') {
          setCaptions(prev => {
            const newText = data.text.trim();
            if (prev.endsWith(newText)) {
              return prev;
            }
            const overlap = findOverlap(prev, newText);
            if (overlap) {
              return prev + newText.slice(overlap.length);
            }
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

      // Handle audio chunks
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          try {
            const audioBlob = new Blob([event.data], { type: 'audio/webm' });
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
    const setupAudioAndCaptions = async () => {
      if (isPlaying && showCaptions && !audioContextRef.current && audioRef.current) {
        try {
          await setupAudioProcessing();
        } catch (err) {
          console.error('Error setting up audio processing:', err);
          // Silently handle the error but keep captions enabled
        }
      }
    };

    setupAudioAndCaptions();
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
            await new Promise((resolve, reject) => {
              const loadHandler = () => {
                resolve(true);
                audioRef.current?.removeEventListener('loadedmetadata', loadHandler);
                audioRef.current?.removeEventListener('error', errorHandler);
              };
              const errorHandler = () => {
                reject(new Error('Failed to load audio'));
                audioRef.current?.removeEventListener('loadedmetadata', loadHandler);
                audioRef.current?.removeEventListener('error', errorHandler);
              };
              audioRef.current!.addEventListener('loadedmetadata', loadHandler);
              audioRef.current!.addEventListener('error', errorHandler);
            });

            // Set initial duration
            setDuration(audioRef.current.duration);

            // Start playing if needed
            if (isPlaying) {
              await audioRef.current.play();
            }
          } catch (err) {
            console.error('Error loading audio:', err);
            // Don't set error message, just log it
            setIsPlaying(false);
          }
        }
      };

      loadAudio();
    }
  }, [selectedAudio]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-900/75 backdrop-blur-sm" onClick={onClose}></div>
        </div>

        <div className={`relative inline-block w-full max-w-4xl p-6 overflow-hidden text-left align-middle transition-all transform rounded-2xl shadow-xl ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-2xl font-semibold ${
              isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>
              Audio History
            </h3>
            <button
              onClick={onClose}
              className={`p-2 rounded-full transition-colors duration-200 ${
                isDarkMode
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200'
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Audio List */}
          <div className={`space-y-2 mb-6 ${
            isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
          }`}>
            {audioHistory.map((audio) => (
              <div
                key={audio.id}
                className={`flex items-center justify-between p-4 rounded-lg transition-all duration-200 ${
                  selectedAudio?.id === audio.id
                    ? isDarkMode
                      ? 'bg-indigo-900/30 ring-1 ring-indigo-500/50'
                      : 'bg-indigo-50 ring-1 ring-indigo-500/50'
                    : isDarkMode
                      ? 'hover:bg-gray-700/50'
                      : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handlePlay(audio)}
                    disabled={!audio.audioAvailable}
                    className={`p-2 rounded-full transition-all duration-200 ${
                      audio.audioAvailable
                        ? isDarkMode
                          ? 'hover:bg-indigo-900/50 text-indigo-400 hover:text-indigo-300'
                          : 'hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700'
                        : isDarkMode
                          ? 'text-gray-600 cursor-not-allowed'
                          : 'text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {selectedAudio?.id === audio.id && isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </button>
                  <div>
                    <h4 className={`font-medium ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-900'
                    }`}>
                      {audio.title}
                    </h4>
                    <div className="flex items-center mt-1">
                      <Calendar className={`w-4 h-4 mr-1 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                      <span className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {formatDate(audio.time)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Audio Player */}
          {selectedAudio && (
            <div className={`p-4 rounded-lg ${
              isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleTimelineChange}
                    onMouseDown={handleTimelineMouseDown}
                    onMouseUp={handleTimelineMouseUp}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-400"
                  />
                  <div className="flex justify-between mt-1">
                    <span className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {formatTime(currentTime)}
                    </span>
                    <span className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {formatTime(duration)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={handlePlayPauseButton}
                  className={`p-2 rounded-full transition-colors duration-200 ${
                    isDarkMode
                      ? 'hover:bg-gray-600 text-gray-200'
                      : 'hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-2 rounded-full transition-colors duration-200 ${
                      isDarkMode
                        ? 'hover:bg-gray-600 text-gray-200'
                        : 'hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-24 h-2 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-400"
                  />
                </div>

                <button
                  onClick={toggleCaptions}
                  className={`p-2 rounded-full transition-colors duration-200 ${
                    showCaptions
                      ? isDarkMode
                        ? 'bg-indigo-900/50 text-indigo-300'
                        : 'bg-indigo-100 text-indigo-600'
                      : isDarkMode
                        ? 'hover:bg-gray-600 text-gray-200'
                        : 'hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <Subtitles className="w-5 h-5" />
                </button>
              </div>

              {showCaptions && (
                <div className={`mt-4 p-4 rounded-lg ${
                  isDarkMode ? 'bg-gray-800' : 'bg-white'
                } border ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {captions || 'Waiting for speech...'}
                  </p>
                </div>
              )}
            </div>
          )}

          {error && error.includes('Transcription') && (
            <div className={`mt-4 p-4 rounded-lg ${
              isDarkMode ? 'bg-yellow-900/20 text-yellow-200' : 'bg-yellow-50 text-yellow-800'
            }`}>
              {error}
            </div>
          )}

          <audio
            ref={audioRef}
            src={selectedAudio ? getFullAudioUrl(selectedAudio.audioUrl) : ''}
            crossOrigin="anonymous"
            onTimeUpdate={() => {
              if (!isSeeking && audioRef.current) {
                setCurrentTime(audioRef.current.currentTime);
              }
            }}
            onLoadedMetadata={() => {
              if (audioRef.current) {
                setDuration(audioRef.current.duration);
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              setCurrentTime(0);
            }}
            onError={(e) => {
              console.error('Audio loading error:', e);
              setIsPlaying(false);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default AudioHistoryModal; 