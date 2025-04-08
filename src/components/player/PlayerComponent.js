import React from 'react';
import '../../App.css';
import AudioPlayer from './AudioPlayer';
const PlayerComponent = ({idx, images}) => {
    return (
        <div className="player-container">
            <div className='player'>
                    <AudioPlayer idx={idx} images={images} />
            </div>
        </div>
    );
};

export default PlayerComponent;
