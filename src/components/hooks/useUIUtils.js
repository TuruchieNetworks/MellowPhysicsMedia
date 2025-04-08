import { useCallback } from 'react';

const useUIUtils = () => {
    // Time Converter
    const timeConverter = (timeInSeconds) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds - minutes * 60);
        const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
        const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;
        return `${formattedMinutes}:${formattedSeconds}`;
    };
    // Generate a random hex color
    const randomHexColor = useCallback(() => {
        return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
    }, []);

    // Generate a random RGBA color
    const randomRgbaColor = useCallback(() => {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        const a = Math.random().toFixed(2); // Random alpha between 0 and 1
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    }, []);

    return { randomHexColor, randomRgbaColor, timeConverter };
};

export default useUIUtils;


















// const randomHexColor = useCallback(() => {
//     return `${Math.floor(Math.random(0xFFFFFF) * 0xFFFFFF)}`;
// }, []);