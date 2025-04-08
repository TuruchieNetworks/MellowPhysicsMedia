import React, { useRef, useEffect } from 'react';

const SceneRecorder = () => {
    const videoRef = useRef(null);
    const recorderRef = useRef(null);
    const chunks = useRef([]);

    useEffect(() => {
        const handleDataAvailable = (event) => {
            if (event.data.size > 0) {
                chunks.current.push(event.data);
            }
        };

        // Initialize MediaRecorder with the video element
        if (videoRef.current) {
            const stream = videoRef.current.captureStream(30); // 30 FPS
            recorderRef.current = new MediaRecorder(stream);
            recorderRef.current.ondataavailable = handleDataAvailable;
            recorderRef.current.onstop = handleStop;
        }

        return () => {
            // Cleanup on unmount
            if (recorderRef.current) {
                recorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleStop = () => {
        const blob = new Blob(chunks.current, { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'threejs_scene.mp4';
        a.click();

        // Reset chunks for next recording
        chunks.current = [];
    };

    const startRecording = () => {
        if (recorderRef.current) {
            recorderRef.current.start();
        }
    };

    const stopRecording = () => {
        if (recorderRef.current) {
            recorderRef.current.stop();
        }
    };

    // Optional: Automatically start recording for 10 seconds
    useEffect(() => {
        startRecording();
        const timer = setTimeout(stopRecording, 10000); // Stop recording after 10 seconds

        return () => clearTimeout(timer); // Cleanup timer on unmount
    }, []);

    return (
        <div>
            <video ref={videoRef} style={{ display: 'none' }} autoPlay muted />
            {/* You can add buttons to start/stop recording manually if needed */}
        </div>
    );
};

// Export the SceneRecorder component
export default SceneRecorder;
