import { useCallback } from 'react';

const useColorUtils = () => {
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

    return { randomHexColor, randomRgbaColor };
};

export default useColorUtils;


















    // const randomHexColor = useCallback(() => {
    //     return `${Math.floor(Math.random(0xFFFFFF) * 0xFFFFFF)}`;
    // }, []);