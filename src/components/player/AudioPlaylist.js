import React from 'react';
import useAudioPlayer from '../hooks/useAudioPlayer';
import PlayPauseButton from './PlayPauseButton';

const AudioPlaylist = () => {
  const { musicList } = useAudioPlayer();

  return (
    <div className="playlist-container">
      {musicList.map((track, index) => (
        <div key={track.title} className="playlist-item">
          <span>{track.title} - {track.artist}</span>
          <PlayPauseButton track={track} index={index} />
        </div>
      ))}
    </div>
  );
};

export default AudioPlaylist;







// import React from 'react';
// import useAudioPlayer from '../hooks/useAudioPlayer';

// const AudioPlaylist = () => {
//   const {
//     musicList,
//     isPlaying,
//     trackIndex,
//     playpauseTrack,
//     setCurrentTrack
//   } = useAudioPlayer();

//   return (
//     <div className="playlist-container">
//       {musicList.map((track, index) => (
//         <div key={track.title} className="playlist-item">
//           <span>{track.title} - {track.artist}</span>
//           <i
//             className={`fa ${isPlaying && trackIndex === index ? "fa-pause" : "fa-play"} fa-2x`}
//             onClick={() => {
//               setCurrentTrack(index); // Set track to play
//               playpauseTrack();
//             }}
//           />
//         </div>
//       ))}
//     </div>
//   );
// };

// export default AudioPlaylist;


