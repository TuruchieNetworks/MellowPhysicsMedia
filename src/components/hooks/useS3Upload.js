import { useState } from 'react';
import { Storage, API, graphqlOperation } from 'aws-amplify';
import { createSong } from './graphql/mutations';

const useS3Upload = () => {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const uploadSong = async (formData, mp3Data) => {
        setUploading(true);
        setError(null);
        setSuccess(false);

        const { songName, songArtist, songDescription, songImage } = formData;

        try {
            // Upload song image to S3
            let songImageUrl = '';
            if (songImage) {
                const imageResult = await Storage.put(songImage.name, songImage, {
                    contentType: songImage.type,
                });
                songImageUrl = imageResult.key; // Get S3 key for image
            }

            // Upload MP3 file to S3
            let songMp3Url = '';
            if (mp3Data) {
                const mp3Result = await Storage.put(mp3Data.name, mp3Data, {
                    contentType: mp3Data.type,
                });
                songMp3Url = mp3Result.key; // Get S3 key for MP3
            }

            // Prepare song data for GraphQL mutation
            const createSongInput = {
                songName,
                songArtist,
                songDescription,
                songImage: songImageUrl,
                songMp3: songMp3Url,
                like: 0,
                isPrivate: false,
                comments: '',
            };

            // Call the GraphQL mutation to store the song data
            const response = await API.graphql(graphqlOperation(createSong, { input: createSongInput }));
            setSuccess(true);
            return response.data;
        } catch (err) {
            setError(err);
            console.error('Error uploading song:', err);
        } finally {
            setUploading(false);
        }
    };

    return { uploading, error, success, uploadSong };
};

export default useS3Upload;