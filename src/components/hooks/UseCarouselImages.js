import { useEffect, useRef, useState } from 'react';

const useCarouselImages = (images, intervalDuration = 2000) => {
    const [idx, setIdx] = useState(0); // current index of the image
    const intervalRef = useRef(null); // to hold the interval reference

    useEffect(() => {
        intervalRef.current = setInterval(run, intervalDuration); // Start the interval

        return () => clearInterval(intervalRef.current); // Cleanup on unmount
    }, [intervalDuration, images.length]);

    const run = () => {
        setIdx((prevIdx) => (prevIdx + 1) % images.length); // Loop back to the start
    };

    const changeImage = (newIdx) => {
        setIdx(newIdx);
        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(run, intervalDuration); // Reset interval on manual change
    };

    return { idx, changeImage };
};

export default useCarouselImages;
