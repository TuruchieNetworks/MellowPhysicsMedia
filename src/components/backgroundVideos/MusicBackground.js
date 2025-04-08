import React, { useRef, useEffect } from 'react';
import '../../styles/VideoBackground.css';
import Music from '../auth/Music';
import ImageUtils from '../hooks/ImageUtils';
import UseVideoBackground from '../hooks/UseVideoBackground';
import useBackgroundImages from '../hooks/UseBackgroundImages';
import MusicUtils from '../player/MusicUtils';

const MusicBackground = () => {
    const musicUtils = new MusicUtils();
    const imageUtilities = new ImageUtils();
    const images = imageUtilities.getAllCarouselImages();
    const videosList = musicUtils.getVideoList();
    const logo_scene = videosList[0].video;
    const { videoRef } = UseVideoBackground();
    const { idx } = useBackgroundImages(images); // Use the custom hook

    return (
        <div className=""
            id="showcase"
            style={{
                backgroundImage: `url(${images[idx]})`,
                backgroundSize: 'cover', 
                backgroundPosition: 'center',
                transition: 'background-image 0.5s ease-in-out',
                width: '100vw',
                height: '100vh',
            }}
        >
            <video ref={videoRef} loop muted autoPlay style={{display: 'none'}}>
                <source src={logo_scene} type="video/mp4" />
                Your browser does not support HTML5 video.
            </video>
            <Music/>
        </div>
    );
};

export default MusicBackground;
