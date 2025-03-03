import React, { useEffect, useRef, useState } from 'react';
import { Volume2, Play, Pause } from 'lucide-react';
import { CallAudioHistory } from '../../data/mockData';

interface AudioPlayerProps {
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  audioUrl?: string;
  selectedAudio: CallAudioHistory | null;
  onPlayPause: () => void;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTimeUpdate: (time: number) => void;
  onEnded: () => void;
  formatTime: (seconds: number) => string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  isPlaying,
  volume,
  currentTime,
  audioUrl,
  selectedAudio,
  onPlayPause,
  onVolumeChange,
  onSeek,
  onTimeUpdate,
  onEnded,
  formatTime
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (audioUrl) {
      try {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.removeEventListener('loadedmetadata', () => {});
          audioRef.current.removeEventListener('timeupdate', () => {});
          audioRef.current.removeEventListener('ended', () => {});
        }

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.addEventListener('loadedmetadata', () => {
          console.log('Audio metadata loaded:', {
            duration: audio.duration,
            src: audio.src
          });
          setDuration(Math.floor(audio.duration || 0));
          setIsLoading(false);
          setError(null);
        });

        audio.addEventListener('timeupdate', () => {
          onTimeUpdate(Math.floor(audio.currentTime || 0));
        });

        audio.addEventListener('ended', () => {
          onEnded();
        });

        audio.addEventListener('error', (e) => {
          console.error('Audio loading error:', e);
          setError('Error loading audio file');
          setIsLoading(false);
        });

        // Set initial volume
        audio.volume = volume;

      } catch (err) {
        console.error('Error setting up audio:', err);
        setError('Error initializing audio player');
        setIsLoading(false);
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener('loadedmetadata', () => {});
        audioRef.current.removeEventListener('timeupdate', () => {});
        audioRef.current.removeEventListener('ended', () => {});
        audioRef.current.removeEventListener('error', () => {});
      }
    };
  }, [audioUrl, onTimeUpdate, onEnded]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error('Error playing audio:', error);
          });
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseInt(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    onSeek(e);
  };

  return (
    <div className="mb-8 bg-white p-6 rounded-lg border border-gray-200">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            {selectedAudio ? `${selectedAudio.quarter} ${selectedAudio.year} Earnings Call` : 'Earnings Call'}
          </h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Volume2 className="w-5 h-5 text-gray-500 mr-2" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={onVolumeChange}
                className="w-24"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={onPlayPause}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
            disabled={isLoading || !!error}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-gray-700" />
            ) : (
              <Play className="w-6 h-6 text-gray-700" />
            )}
          </button>
          <div className="flex-1 flex items-center space-x-4">
            <span className="text-sm text-gray-500 w-12">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1"
              disabled={isLoading || !!error}
            />
            <span className="text-sm text-gray-500 w-12">
              {isLoading ? '--:--' : formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
      {isLoading && (
        <div className="mt-4 text-sm text-gray-500 text-center">
          Loading audio...
        </div>
      )}
      {error && (
        <div className="mt-4 text-sm text-red-500 text-center">
          {error}
        </div>
      )}
      <div className="mt-2 text-xs text-gray-500">
        Current audio URL: {audioUrl}
      </div>
    </div>
  );
};

export default AudioPlayer; 
