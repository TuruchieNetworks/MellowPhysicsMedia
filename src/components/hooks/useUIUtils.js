import { useCallback } from 'react';

const useUIUtils = () => {
    const timeConverter = (timeInSeconds) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds - minutes * 60);
        const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
        const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;
        return `${formattedMinutes}:${formattedSeconds}`;
    };

    // This function sets up the metadata and time updates for the track
    const updateCurrentTrack = (currentTrack, setTotalDuration, setCurrentTime, setRemainingDuration) => {
        currentTrack.addEventListener('loadedmetadata', () => {
            const newDuration = currentTrack.duration;
            const newCurrentTime = currentTrack.currentTime;

            const formattedCurrentTime = timeConverter(newCurrentTime);
            const formattedRemainingTime = timeConverter(newDuration - newCurrentTime);
            const formattedTotalDuration = timeConverter(newDuration);

            // Update states with formatted time
            setTotalDuration(formattedTotalDuration);
            setCurrentTime(formattedCurrentTime);
            setRemainingDuration(formattedRemainingTime);
        });
    };

    const formatPlayerTimer = (currentTrack, newCurrentTime, newDuration, setCurrentMinutes, setCurrentSeconds, setDurationMinutes, setDurationSeconds, setCurrentTime, setRemainingDuration, setTotalDuration) => {
      const newCurrentMinutes = Math.floor(newCurrentTime / 60);
      const newCurrentSeconds = Math.floor(newCurrentTime - newCurrentMinutes * 60);
      const newDurationMinutes = Math.floor(newDuration / 60);
      const newDurationSeconds = Math.floor(newDuration - newDurationMinutes * 60);
  
      setCurrentMinutes(newCurrentMinutes);
      setCurrentSeconds(newCurrentSeconds);
      setDurationMinutes(newDurationMinutes);
      setDurationSeconds(newDurationSeconds);
  
      // Using timeConverter from useUIUtils
      const formattedCurrentTime = timeConverter(newCurrentTime);
      const formattedRemainingTime = timeConverter(newDuration - newCurrentTime);
      const formattedTotalDuration = timeConverter(currentTrack.duration);
  
      setTotalDuration(formattedTotalDuration);
      setCurrentTime(formattedCurrentTime);
      setRemainingDuration(formattedRemainingTime);
    }

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

    return { randomHexColor, randomRgbaColor, timeConverter , updateCurrentTrack, formatPlayerTimer };
};

export default useUIUtils;


















// const randomHexColor = useCallback(() => {
//     return `${Math.floor(Math.random(0xFFFFFF) * 0xFFFFFF)}`;
// }, []);