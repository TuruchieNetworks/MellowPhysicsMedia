import React, { useRef } from 'react';

const AudioPlayer = ({
  idx, 
  images,
  musicList,
  isMuted,
  isRandom,
  isRepeat,
  isPlaying,
  seekSlider,
  trackIndex,
  currentTime,
  volumeSlider,
  totalDuration,
  remainingDuration,
  seekTo,
  setVolume,
  stopTrack,
  nextTrack,
  prevTrack,
  toggleMute,
  repeatTrack,
  randomTrack,
  setSeekSlider,
  playpauseTrack,
  setVolumeSlider}) => {
  // Refs for seek slider and volume slider
  const volumeRef = useRef(null);
  const seekSliderRef = useRef(null);

  return (
    <div className="shadow-container">
      {/* Dynamic Track Info */}
      <div className="track-info">
        <p style={{ fontSize: 'small' }}>Now Playing: {musicList[trackIndex]?.title || "No Track"}</p>
      </div>
      {/* Volume Control */}

      {/* Seek Bar */}
      <div className="slider-panel">
        <p style={{ fontSize: 'small' }}>{currentTime ?? 0}</p>
        <input
          ref={seekSliderRef} // Attach ref to seek slider
          style={{
            cursor: 'pointer',
            backgroundImage: `url(${images[idx]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transition: 'background-image 0.5s ease-in-out',
          }}
          type="range"
          min="0"
          max="100"
          value={seekSlider}
          className="seek_slider"
          onChange={e => {
            const value = e.target.value;
            setSeekSlider(value);  // Update seekSlider state
            seekTo(e);  // Pass the event directly to seekTo
          }}
        />
        <p style={{ fontSize: 'small' }}>{remainingDuration ?? 0}</p>
      </div>

      {/* Player Controls */}
      <div className='player-flex-panels'>
        <i className="fa fa-step-backward fa-2x" onClick={prevTrack}></i>
        <i className={`fa ${isPlaying ? "fa-pause" : "fa-play"} fa-2x`} onClick={playpauseTrack}></i>
        <i className="fa fa-stop fa-2x" onClick={stopTrack}></i>
        <i className="fa fa-step-forward fa-2x" onClick={nextTrack}></i>
        <i className={`fa fa-repeat fa-2x ${isRepeat ? "active" : ""}`} onClick={repeatTrack}></i>
        <i className={`fas fa-random fa-2x ${isRandom ? "active" : ""}`} onClick={randomTrack}></i>
      </div>

      <div className="player-flex-panels" style={{ fontSize: 'small' }}>
        <i
          className={`fa ${isMuted ? 'fa-volume-off' : 'fa-volume-down'}`} // Toggle icon based on mute state
          style={{ margin: '5px', cursor: 'pointer' }}////
          onClick={toggleMute}
        />

        <input
          ref={volumeRef} // Attach ref to volume slider
          style={{
            cursor: 'pointer',
            backgroundImage: `url(${images[idx]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transition: 'background-image 0.5s ease-in-out'
          }}
          type="range"
          min="0"
          max="100"
          value={volumeSlider}
          className="volume_slider"
          onChange={(e) => {
            const value = e.target.value;
            setVolumeSlider(value)
            setVolume(value)
          }}
        />

        <p style={{ fontSize: 'small' }}>Volume</p>
        <p style={{ fontSize: 'small' }}>Track Duration: {totalDuration ?? 0}</p>
      </div>
    </div>
  );
};

export default AudioPlayer;