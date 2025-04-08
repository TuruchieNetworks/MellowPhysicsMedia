import React from 'react';
import { Link } from 'react-router-dom';
import '../../App.css';
import '../../styles/PlayerAnimations.css';
import Biography from './Bio';
import ImageCarousel from '../carousels/ImageCarousel';
import BottomLinks from './BottomLinks';

const BioCarousel = ({ idx, images, handleNext, handlePrev }) => {
  return (
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
      <div className="container showcase-container">
        <div className='flex-carousel'>
          <div className='showcase-container'>
            <ImageCarousel idx={idx} handleNext={handleNext} handlePrev={handlePrev} images={images} />
          </div>
          <div className='pcBio'>
            <Biography />
          </div>
        </div>
        <div className='phoneBio'>
          <Biography />
        </div>
        <div className="shadow-flex-container type-writer">
          <BottomLinks />
        </div>
      </div>
    </div>
  );
};

export default BioCarousel;