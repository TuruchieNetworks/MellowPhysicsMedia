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


const Merchandise = ({ currentBackground }) => {
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
                    <AudioPlayer />
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
