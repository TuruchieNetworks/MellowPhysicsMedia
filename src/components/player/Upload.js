import React, { useState } from 'react';
import useS3Upload from './useS3Upload';

const Upload = () => {
  const [mp3Data, setMp3Data] = useState(null);
  const [formData, setFormData] = useState({
    songName: '',
    songArtist: '',
    songDescription: '',
    songImage: null,
  });

  const { uploading, error, success, uploadSong } = useS3Upload();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await uploadSong(formData, mp3Data);
    if (result) {
      // Handle success, e.g., navigate to a different page
      console.log('Song uploaded successfully:', result);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Song Name Input */}
      <div className="bluebtn leadShowcas profilecontainer dark-card-cover form-group">
        <label htmlFor="songName">Song Name</label>
        <input
          className="textShowcase"
          type="text"
          placeholder="Enter Song Name"
          value={formData.songName}
          onChange={(e) => setFormData({ ...formData, songName: e.target.value })}
        />
      </div>

      {/* Song Artist Input */}
      <div className="profilecontainer purple-circle-container form-group">
        <label htmlFor="songArtist">Song Artist</label>
        <input
          className="textShowcase"
          type="text"
          placeholder="Enter Song Artist"
          value={formData.songArtist}
          onChange={(e) => setFormData({ ...formData, songArtist: e.target.value })}
        />
      </div>

      {/* Song Image Input */}
      <div className="profilecontainer purple-circle-container form-group">
        <label htmlFor="songImage">Song Image</label>
        <input
          className="textShowcase"
          type="file"
          placeholder="Upload Song Image"
          onChange={(e) => setFormData({ ...formData, songImage: e.target.files[0] })}
          style={{ cursor: 'pointer' }}
        />
      </div>

      {/* MP3 File Input */}
      <div className="profilecontainer purple-circle-container form-group">
        <label htmlFor="songMp3">Song MP3</label>
        <input
          className="textShowcase"
          type="file"
          placeholder="Upload MP3"
          onChange={(e) => setMp3Data(e.target.files[0])} // Set the MP3 file
          style={{ cursor: 'pointer' }}
        />
      </div>

      {/* Song Description */}
      <div className="form-group">
        <textarea
          rows="10"
          cols="20"
          value={formData.songDescription}
          onChange={(e) => setFormData({ ...formData, songDescription: e.target.value })}
          placeholder="Enter Song Description"
        />
      </div>

      {/* Submit Button */}
      <button type="submit" disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload Song'}
      </button>

      {/* Error & Success Messages */}
      {error && <p>Error: {error.message}</p>}
      {success && <p>Song uploaded successfully!</p>}
    </form>


  );
};

export default Upload;