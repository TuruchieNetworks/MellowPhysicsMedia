import React from 'react';
import '../../styles/VideoBackground.css';

const VideoBackground = ({videoRef, logo_scene}) => {

    return (
        <div className="video-background">
            <video ref={videoRef} loop muted autoPlay>
                <source src={logo_scene} type="video/mp4" />
                Your browser does not support HTML5 video.
            </video>
        </div>
    );
};

export default VideoBackground;