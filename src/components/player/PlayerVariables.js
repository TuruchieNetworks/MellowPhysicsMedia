class PlayerVariables {
  constructor(updateIntervalRef) {
    this.nowPlaying = 'PLAYING: x of y';
    this.trackArt = 'track-art';
    this.trackName = 'track-name';
    this.trackArtist = 'track-artist';
    this.currentTrack = new Audio();
    this.currentIndex = 0;
    this.trackIndex = 0;
    this.playPauseBtn = '▶';
    this.nextBtn = 'next-track';
    this.prevBtn = 'prev-track';
    this.currentTimePoint = 0;
    this.seekSlider = 0;
    this.seekToPoint = 0;
    this.seekPosition = 0;
    this.volumeSlider = 99;
    this.volumePointValue = this.currentTrack.volume;
    this.currentTime = '00.00';
    this.totalDuration = '00.00';
    this.totalDynamicDuration = '00.00';
    this.currentMinutes = 0;
    this.currentSeconds = 0;
    this.durationMinutes = 0;
    this.durationSeconds = 0;
    this.updateTimer = 0;
    this.updateInterval = updateIntervalRef; // Store the passed ref
    this.wave = 'wave';
    this.randomIcon = 'fa-random';
    this.isPlaying = false;
    this.isRandom = false;
    this.randomIndex = 0;
    this.audioContainer = 'audio-container';
    this.sliderContainer = 'slider_container';
    this.progress = 'current-time';
    this.user = null;
    this.dynamicLeadClasses = 'lead purple-circle-containe';
    this.logoLeads = '🎶MELODY DREAMS🎶';
    this.dynamicContents = "leadShowcase";
    this.dynamicMessage = this.totalDuration;
    this.cardClass = "dark-glow bluebtn box-shadow";
    this.musicList = [
      {
        img: 'img/faded.png',
        name: 'Moody Choir Sanctuary',
        artist: 'Turuchie',
        music: 'music/MOODY_CHOIR_SANCTUARY.mp3',
      },
    ];
  }

  init() {
    this.currentTrack.volume = 1.0;
  }
}
export default PlayerVariables;