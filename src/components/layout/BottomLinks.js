import React from 'react';
import { Link } from 'react-router-dom';
import '../../App.css';
import '../../styles/PlayerAnimations.css';

const BottomLinks = ({ idx, images, handleNext, handlePrev }) => {
  return (
    <div className='phone-state type-writer'>
      <Link to="/landing" className='btn party-lights'>
        <span className="party-lights spreader">
          <span className="spreader type-writer">ECool Entertainment And More </span>🎶
          <span className="fas fa-drum"></span>
        </span>
      </Link>

      <Link to="/about" className="btn party-lights">
        Read More
      </Link>
    </div>
  );
};

export default BottomLinks;