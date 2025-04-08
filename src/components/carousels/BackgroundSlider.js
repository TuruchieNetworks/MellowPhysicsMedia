import React, { useState, useEffect, useMemo } from "react";
import "../../BackgroundSlider.css";

// List of static images
import logo from '../../img/logo.jpg';
import poseBrownGradient from '../../img/pose_brown_gradient.jpg';
import poseGazeBrown from '../../img/pose_gaze_brown.jpg';
import smilingPoseKharki from '../../img/smiling_pose_brown.jpg';
import solidPoseKharki from '../../img/solid_pose_kharki.jpg';

const BackgroundSlider = ({ autoSlide = false, slideInterval = 3000 }) => {
  // Memoize the images array
  const images = useMemo(() => [
    logo,
    poseBrownGradient,
    poseGazeBrown,
    smilingPoseKharki,
    solidPoseKharki
  ], []);

  const [activeSlide, setActiveSlide] = useState(0);

  // Set the background image for the body when activeSlide changes
  useEffect(() => {
    document.body.style.backgroundImage = `url(${images[activeSlide]})`;
  }, [activeSlide, images]);

  // Function to move to the next slide
  const nextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % images.length);
  };

  // Function to move to the previous slide
  const prevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + images.length) % images.length);
  };

  // Auto slide effect if enabled
  useEffect(() => {
    let intervalId;
    if (autoSlide) {
      intervalId = setInterval(nextSlide, slideInterval);
    }

    return () => {
      clearInterval(intervalId); // Cleanup on unmount or when autoSlide changes
    };
  }, [autoSlide, slideInterval]);

  return (
    <div className="slider-container">
      {/* Render each slide */}
      {images.map((image, index) => (
        <div
          key={index}
          className={`slide ${index === activeSlide ? "active" : ""}`}
          style={{ backgroundImage: `url(${image})` }}
        >
        </div>
      ))}

      {/* Left/Right Arrows */}
      <button className="arrow left-arrow" onClick={prevSlide}>
        &#9664; {/* Left arrow symbol */}
      </button>
      <button className="arrow right-arrow" onClick={nextSlide}>
        &#9654; {/* Right arrow symbol */}
      </button>
    </div>
  );
};

export default BackgroundSlider;