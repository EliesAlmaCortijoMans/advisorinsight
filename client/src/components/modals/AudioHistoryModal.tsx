import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, Calendar, Volume2, VolumeX } from 'lucide-react';

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

  const seekToPosition = async (position: number) => {
    if (!audioRef.current) return;

    try {
      // Pause the audio first
      audioRef.current.pause();
      
      // Wait for a small buffer
      await new Promise(resolve => setTimeout(resolve, 100));

      // Set the new position
      audioRef.current.currentTime = position;
      setCurrentTime(position);

      // Wait for another small buffer
      await new Promise(resolve => setTimeout(resolve, 100));

      // Resume playback if it was playing
      if (isPlaying) {
        await audioRef.current.play();
      }
    } catch (err) {
      console.error('Error in seekToPosition:', err);
      setError('Failed to seek to position');
    }
  };

  const handleTimelineChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;

    try {
      const percent = parseFloat(e.target.value) / 100;
      const newTime = Math.floor(audioRef.current.duration * percent);
      
      console.log('Seeking to position:', {
        percent,
        newTime,
        duration: audioRef.current.duration
      });

      await seekToPosition(newTime);
    } catch (err) {
      console.error('Error in handleTimelineChange:', err);
      setError('Failed to seek');
    }
  };

  const handleTimelineSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    
    const percent = parseFloat(e.target.value) / 100;
    const newTime = Math.floor(audioRef.current.duration * percent);
    setCurrentTime(newTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value;
    }
    if (value === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

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

            // Set new source
            audioRef.current.src = selectedAudio.audioUrl;
            audioRef.current.load();
            audioRef.current.volume = volume;

            // Wait for metadata to load
            await new Promise((resolve) => {
              audioRef.current!.addEventListener('loadedmetadata', resolve, { once: true });
            });

            // Set initial duration
            setDuration(audioRef.current.duration);
            console.log('Audio loaded successfully:', {
              duration: audioRef.current.duration,
              readyState: audioRef.current.readyState
            });

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
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{audio.title}</div>
                  <div className="text-indigo-600">
                    {selectedAudio?.id === audio.id ? (
                      isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />
                    ) : (
                      audio.audioAvailable ? (
                        <Play className="w-4 h-4 opacity-50" />
                      ) : (
                        <span className="text-sm text-gray-500">Not available</span>
                      )
                    )}
                  </div>
                </div>
                {audio.time && (
                  <div className="text-sm text-gray-500 flex items-center mt-1">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(audio.time)}
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

          <div className="flex-1 flex">
            {/* Audio visualization area */}
            <div className="flex-1 p-6 flex items-center justify-center">
              {selectedAudio ? (
                <div className="text-center w-full">
                  <div className="bg-gray-100 rounded-lg p-8 mb-4">
                    {/* Audio visualization placeholder */}
                    <div className="h-32 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <span className="text-indigo-600">Audio Waveform</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">
                  Select an earnings call recording from the sidebar to listen
                </div>
              )}
            </div>

            {/* Audio controls */}
            {selectedAudio && (
              <div className="w-64 border-l border-gray-200 p-4 flex flex-col">
                <div className="mb-8">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={(currentTime / (duration || 1)) * 100}
                    step="1"
                    onChange={handleTimelineSeek}
                    onMouseUp={handleTimelineChange}
                    onTouchEnd={handleTimelineChange}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <button onClick={toggleMute} className="text-gray-600 hover:text-gray-800">
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-full ml-2"
                    />
                  </div>
                </div>

                <button
                  onClick={handlePlayPauseButton}
                  className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Hidden audio element for playing the audio */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current && !isSeeking) {
            const time = Math.floor(audioRef.current.currentTime);
            if (!isNaN(time)) {
              setCurrentTime(time);
            }
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            const duration = Math.floor(audioRef.current.duration);
            if (!isNaN(duration)) {
              setDuration(duration);
            }
          }
        }}
        onError={(e) => {
          const error = audioRef.current?.error;
          console.error('Audio error:', {
            error,
            code: error?.code,
            message: error?.message,
            src: audioRef.current?.src
          });
          setError('Error loading audio file');
        }}
        preload="metadata"
      />
    </div>
  );
};

export default AudioHistoryModal; 