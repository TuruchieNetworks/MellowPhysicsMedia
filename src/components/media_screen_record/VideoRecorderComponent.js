// VideoRecorderComponent.jsx
import React, { useRef, useEffect, useState } from 'react';

const VideoRecorderComponent = ({ canvasRef }) => {
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [chunks, setChunks] = useState([]);
    const [isRecording, setIsRecording] = useState(false);

    useEffect(() => {
        if (canvasRef.current) {
            const stream = canvasRef.current.captureStream(60); // Capture at 60 FPS
            const recorder = new MediaRecorder(stream);

            recorder.ondataavailable = (event) => {
                setChunks((prevChunks) => [...prevChunks, event.data]);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/mp4' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'threejs_scene.mp4';
                a.click();
                setChunks([]); // Reset chunks for the next recording
            };

            setMediaRecorder(recorder);
        }
    }, [canvasRef, chunks]);

    const startRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.start();
            setIsRecording(true);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            setIsRecording(false);
        }
    };

    return (
        <div>
            <button onClick={startRecording} disabled={isRecording}>
                Start Recording
            </button>
            <button onClick={stopRecording} disabled={!isRecording}>
                Stop Recording
            </button>
        </div>
    );
};

export default VideoRecorderComponent;
