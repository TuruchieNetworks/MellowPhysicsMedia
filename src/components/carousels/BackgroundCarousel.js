import React, { useEffect, useState, useRef } from 'react';
import Biography from '../layout/Bio';
import ImageCarousel from './ImageCarousel';


const BackgroundCarousel = ({ idx, handleNext, handlePrev, images }) => {
  // const { idx, changeImage } = useCarouselImages(images);
  //console.log(changeImage);

  return (
    <div className="Carousel"
      style={{
        backgroundImage: `url(${images[idx]})`,
        width: '100vw',
        height: '100vh', 
        backgroundSize: 'cover', // Ensure the background covers the whole container
        backgroundPosition: 'center', // Position the background image in the center
        transition: 'background-image 0.5s ease-in-out',
      }}>
      <div className="background-container">
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
      <div className='phone-state'>
      </div>
    </div>
  )
};

export default BackgroundCarousel;