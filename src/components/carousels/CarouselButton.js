import React from 'react';

const CarouselButton = ({ direction, handleClick }) => {
    return (
        <button id={direction} className="btn" onClick={handleClick}>
            {direction === 'left' ? (
                <>
                    <i className="fas fa-step-backward"></i> Prev
                </>
            ) : (
                <>
                    Next <i className="fas fa-step-forward"></i>
                </>
            )}
        </button>
    );
};

export default CarouselButton;
