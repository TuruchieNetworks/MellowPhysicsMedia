import { useEffect, useRef, useState, useCallback } from 'react';

const useCarousel = (images, intervalDuration = 2000) => {
    const [idx, setIdx] = useState(0); // current index of the image
    const intervalRef = useRef(null); // to hold the interval reference

    const run = useCallback(() => {
        setIdx((prevIdx) => (prevIdx + 1) % images.length); // Loop back to the start
    }, [images.length]);

    useEffect(() => {
        intervalRef.current = setInterval(run, intervalDuration); // Start the interval

        return () => clearInterval(intervalRef.current); // Cleanup on unmount
    }, [intervalDuration, run]); // Include run in the dependency array

    const changeImage = (newIdx) => {
        setIdx(newIdx);
    };

    const resetInterval = () => {
        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(run, intervalDuration);
    };

    const handleNext = () => {
        changeImage((prevIdx) => (prevIdx + 1) % images.length); // Move to the next image
        resetInterval();
    };

    const handlePrev = () => {
        changeImage((prevIdx) => (prevIdx - 1 + images.length) % images.length); // Move to the previous image
        resetInterval();
    };

    return { idx, handleNext, handlePrev };
};

export default useCarousel