import React from 'react';
import '../../App.css';
import '../../styles/PlayerAnimations.css';
import ImageUtils from '../hooks/ImageUtils';
import MusicUtils from '../player/MusicUtils';
import useCarousel from '../hooks/UseCarousel';
import AudioPlayer from '../player/AudioPlayer';
import UseVideoBackground from '../hooks/UseVideoBackground';
import BackgroundCarousel from '../carousels/BackgroundCarousel';
import VideoBackground from '../backgroundVideos/VideoBackground';
import FloatingTerrains from '../physics_graphics/SceneComponents/FloatingTerrains';
import FloatingCities from '../physics_graphics/SceneComponents/FloatingCities';
import VideoScene from '../backgroundVideos/VideoScene';
import BioCarousel from '../layout/BioCarousel';

const Contact = () => {
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
            <FloatingCities />
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
                <VideoBackground logo_scene={logo_scene} videoRef={videoRef} />
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
                    <FloatingTerrains />
                </div>
                <BackgroundCarousel idx={idx} handleNext={handleNext} handlePrev={handlePrev} images={images} />
                <div className="container">
                    <div className='player-container'>
                        <AudioPlayer idx={idx} images={images} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Contact;