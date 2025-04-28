import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../../App.css';
import ImageCarousel from '../carousels/ImageCarousel';
import HeaderLinks from '../headers/HeaderLinks';
import Bio from '../layout/Bio';
import UseVideoBackground from '../hooks/UseVideoBackground';
import BackgroundCarousel from '../carousels/BackgroundCarousel';
import useCarouselImages from '../hooks/UseCarouselImages';
import AudioPlayer from '../player/AudioPlayer';
import MusicUtils from '../player/MusicUtils';
import ImageUtils from '../hooks/ImageUtils';
import useAudioPlayer from '../hooks/useAudioPlayer';


const Merchandise = ({ currentBackground }) => {
    const {
        currentTrack,
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
        setVolumeSlider
    } = useAudioPlayer();
    const musicUtils = new MusicUtils();
    const imageUtilities = new ImageUtils();
    const images = imageUtilities.getAllCarouselImages();
    const { videoRef } = UseVideoBackground();
    const videosList = musicUtils.getVideoList();
    const logo_scene = videosList[0].video

    const { idx } = useCarouselImages(images);

    return (
        <div
            id="showcase"
            style={{
                width: '100vw',
                height: '100vh',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundImage: `url(${images[idx]})`,
                transition: 'background-image 0.5s ease-in-out',
            }}
        >
            <div className="container showcase-container imageCover">
                <div className='flex-carousel'>
                    <div className='showcase-container'>
                        <ImageCarousel />
                    </div>
                    <div className='pcBio'>
                        <Bio />
                    </div>
                </div>
                <div className='player-container'>
                    <AudioPlayer
                        idx={idx}
                        images={images}
                        musicList={musicList}
                        isMuted={isMuted}
                        isRandom={isRandom}
                        isRepeat={isRepeat}
                        isPlaying={isPlaying}
                        seekSlider={seekSlider}
                        trackIndex={trackIndex}
                        currentTime={currentTime}
                        volumeSlider={volumeSlider}
                        totalDuration={totalDuration}
                        remainingDuration={remainingDuration}
                        seekTo={seekTo}
                        setVolume={setVolume}
                        stopTrack={stopTrack}
                        nextTrack={nextTrack}
                        prevTrack={prevTrack}
                        toggleMute={toggleMute}
                        repeatTrack={repeatTrack}
                        randomTrack={randomTrack}
                        setSeekSlider={setSeekSlider}
                        playpauseTrack={playpauseTrack}
                        setVolumeSlider={setVolumeSlider}
                    />
                </div>
                <div className='phoneBio'>
                    <Bio />
                </div>
                <div className='phone-state'>
                    <HeaderLinks />
                    <Link to="/about" className="btn party-lights">
                        Read More
                    </Link>
                </div>
            </div>
            <BackgroundCarousel />
        </div>
    );
};

export default Merchandise;
