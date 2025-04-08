import React, { useRef, useEffect } from 'react';
import '../../VideoBackground.css';
import Landing from '../layout/Landing';
import About from '../layout/About';
import MusicUtils from '../player/MusicUtils';
import UseVideoBackground from '../hooks/UseVideoBackground';

const AboutBackground = () => {
    const musicUtils = new MusicUtils();
    const { videoRef } = UseVideoBackground();
    const videosList = musicUtils.getVideoList();
    const logo_scene = videosList[0].video

    return (
        <div
            id="showcase"
            style={{
            //backgroundImage: `url(${images[idx]})`,
            transition: 'background-image 0.5s ease-in-out',
            width: '100vw',
            height: '100vh',
            // backgroundSize: 'cover', 
            // backgroundPosition: 'center',
        }}
        >
            <video ref={videoRef} loop muted autoPlay>
                <source src={logo_scene} type="video/mp4" />
                Your browser does not support HTML5 video.
            </video>
            <Landing/>
            <About/>
        </div>
    );
};

export default AboutBackground;
