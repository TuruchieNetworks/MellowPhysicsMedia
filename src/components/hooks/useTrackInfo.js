import { useState, useEffect } from 'react';

const useTrackInfo = (musicList, initialTrackIndex = 0) => {
  const [trackArt, setTrackArt] = useState('');
  const [nowPlaying, setNowPlaying] = useState('');
  const [totalDuration, setTotalDuration] = useState('00:00');

  useEffect(() => {
    updateTrackInfo(initialTrackIndex);
  }, [initialTrackIndex, musicList]);

  const updateTrackInfo = (trackIndex) => {
    if (!musicList || musicList.length === 0 || !musicList[trackIndex]) {
      setTrackArt('');
      setNowPlaying('No track selected');
      return;
    }

    const track = musicList[trackIndex];
    setTrackArt(track.img || '');
    setNowPlaying(`Playing: ${track.name || 'Unknown Title'} by ${track.artist || 'Unknown Artist'}`);
  };

  return { 
    trackArt,
    nowPlaying,
    totalDuration,
    updateTrackInfo,
    setTrackArt 
  };
};

export default useTrackInfo;