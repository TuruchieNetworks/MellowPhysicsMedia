import React from 'react';
import useAudioPlayer from '../hooks/useAudioPlayer';

const PlayPauseButton = ({ track, index }) => {
  const { isPlaying, trackIndex, playpauseTrack, setCurrentTrack, musicList, addToPlaylist } = useAudioPlayer();

  const handlePlayPause = () => {
    if (trackIndex !== index) {
      setCurrentTrack(index); // Set the selected track as current
      addToPlaylist(track);   // Add to playlist only if switching tracks
    }
    playpauseTrack(); // Toggle play/pause
  };

  return (
    <button onClick={handlePlayPause} className="play-pause-btn">
      <i className={`fa ${isPlaying && trackIndex === index ? 'fa-pause' : 'fa-play'} fa-2x`}></i>
    </button>
  );
};

export default PlayPauseButton;