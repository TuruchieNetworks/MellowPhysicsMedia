import React, { useRef, useEffect, useState } from 'react';
import '../../styles/VideoBackground.css';
import Landing from '../layout/Landing';
import MusicUtils from '../player/MusicUtils';
import ImageUtils from '../hooks/ImageUtils';
import UseVideoBackground from '../hooks/UseVideoBackground';
import useCarouselImages from '../hooks/UseCarouselImages';

const LandingBackground = () => {
    const musicUtils = new MusicUtils();
    const imageUtilities = new ImageUtils();
    const { videoRef } = UseVideoBackground();
    const images = imageUtilities.getAllCarouselImages();
    const { idx } = useCarouselImages(images);
    const videosList = musicUtils.getVideoList();
    const logo_scene = videosList[0].video;

    return (
        <div id="showcase"
            style={{
                backgroundImage: `url(${images[idx]})`,
                backgroundSize: 'cover', 
                backgroundPosition: 'center',
                transition: 'background-image 0.5s ease-in-out',
                // width: '100vw',
                // height: '100vh',
            }}
        >
            <video ref={videoRef} loop muted autoPlay style={{display: 'none'}}>
                <source src={logo_scene} type="video/mp4" />
                Your browser does not support HTML5 video.
            </video>
            <Landing/>
        </div>
    );
};

export default LandingBackground;
