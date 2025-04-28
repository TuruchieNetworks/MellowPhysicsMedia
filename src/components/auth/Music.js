import React from 'react';
import '../../App.css';
import '../../styles/PlayerAnimations.css';
import ImageUtils from '../hooks/ImageUtils';
import MusicUtils from '../player/MusicUtils';
import useCarousel from '../hooks/UseCarousel';
import BioCarousel from '../layout/BioCarousel';
import AudioPlayer from '../player/AudioPlayer';
import useAudioPlayer from '../hooks/useAudioPlayer';
import UseVideoBackground from '../hooks/UseVideoBackground';
import BackgroundCarousel from '../carousels/BackgroundCarousel';
import FloatingClouds from '../physics_graphics/SceneComponents/FloatingClouds';
import FloatingCities from '../physics_graphics/SceneComponents/FloatingCities';
import VideoScene from '../backgroundVideos/VideoScene';

const Music = () => {
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
    const { videoRef } = UseVideoBackground();
    const images = imageUtilities.images.concerts;
    const { idx, handleNext, handlePrev } = useCarousel(images, 2000);
    const videosList = musicUtils.getVideoList();
    const logo_scene = videosList[0].video;

    return (
        <div id="showcase"
            style={{
                backgroundImage: `url(${images[idx]})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transition: 'background-image 0.5s ease-in-out',
            }}
        >
            <FloatingCities currentTrack={currentTrack} isPlaying={isPlaying} trackIndex={trackIndex} />
            <div
                style={{
                    backgroundImage: `url(${images[idx]})`,
                    height: '100vh',
                    width: '100vw',
                    marginTop: '-5.93px',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    transition: 'background-image 0.5s ease-in-out',
                }}>
                <BioCarousel idx={idx} images={images} handleNext={handleNext} handlePrev={handlePrev} />
                <VideoScene logo_scene={logo_scene} videoRef={videoRef} />
                <div className='Carousel'
                    style={{
                        backgroundImage: `url(${images[idx]})`,
                        height: '100vh',
                        width: '100vw',
                        // marginBottom: '-3px',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        transition: 'background-image 0.5s ease-in-out',
                    }}>
                    <FloatingClouds currentTrack={currentTrack} isPlaying={isPlaying} trackIndex={trackIndex} />
                </div>
                <BackgroundCarousel idx={idx} handleNext={handleNext} handlePrev={handlePrev} images={images} />
                <div className="container">
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
                </div>
            </div>
        </div>
    );
};

export default Music;