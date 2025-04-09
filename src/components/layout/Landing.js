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
import BioCarousel from './BioCarousel';
import PhysicsGalaxy from '../physics_graphics/SceneComponents/PhysicsGalaxy';
import FloatingClouds from '../physics_graphics/SceneComponents/FloatingClouds';
import FloatingTerrains from '../physics_graphics/SceneComponents/FloatingTerrains';

const Landing = () => {
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
            <PhysicsGalaxy />
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
                <div className='Carousel'
                    style={{
                        backgroundImage: `url(${images[idx]})`,
                        height: '100vh',
                        width: '100vw',
                        marginBottom: '-3px',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        transition: 'background-image 0.5s ease-in-out',
                    }}>
                    <FloatingClouds />
                </div> 
                <VideoBackground  logo_scene={logo_scene} videoRef={videoRef} />   
                
                {/*  
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

                    <VideoBackground logo_scene={logo_scene} videoRef={videoRef} />           
                    <VideoScene logo_scene={logo_scene} videoRef={videoRef} />   
                */}
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

export default Landing;