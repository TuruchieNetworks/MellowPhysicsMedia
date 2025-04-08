import { useEffect, useRef, useState } from 'react';

const useBackgroundImages = (images, intervalDuration = 2000) => {
    const [idx, setIdx] = useState(0); // current index of the image
    const intervalRef = useRef(null); // to hold the interval reference

    useEffect(() => {
        intervalRef.current = setInterval(run, intervalDuration); // Start the interval

        return () => clearInterval(intervalRef.current); // Cleanup on unmount
    }, [intervalDuration]);

    const run = () => {
        setIdx((prevIdx) => (prevIdx + 1) % images.length); // Loop back to the start
    };

    return { idx };
};

export default useBackgroundImages;
