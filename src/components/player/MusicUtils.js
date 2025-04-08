class MusicUtils {
  constructor() {
    this.baseUrl = "https://your-bucket.s3.amazonaws.com/"; // Replace with your actual S3 bucket URL
    this.musicList = this.getMusicList();
    this.musicTracks = this.getCategorizedMusicList();
  }

  getMusicList() {
    return [
      // Static Track
      {
        title: "Never Change",
        originalTrackName: "NeverChange.mp3",
        img: "NeverChange.jpg",
        name: "Never Change",
        artist: "Animate",
        genre: "Music",
        music: "media/NeverChange.mp3", // Static file path
        file: "media/NeverChange.mp3", // Static file path
      },
      // S3 Hosted Tracks
      //...this.getDynamicS3Tracks(["SkyHigh.mp3", "OceanWaves.mp3"], "Electronic"), // Example tracks
      {
        title: "Moody Choir Sanctuary",
        originalTrackName: "media/MOODY_CHOIR_SANCTUARY.mp3",
        img: "NeverChange.jpg",
        name: "Moody Choir Sanctuary",
        artist: "Animate",
        genre: "Music",
        music: "media/MOODY_CHOIR_SANCTUARY.mp3", // Static file path
        file: "media/MOODY_CHOIR_SANCTUARY.mp3", // Static file path
      },
      {
        title: "Blood Fire And Sweats",
        originalTrackName: "media/BloodFireSweats.mp3",
        img: "BloodFireSweats.jpg",
        name: "Blood Fire And Sweats",
        artist: "Animate",
        genre: "Music",
        music: "media/BloodFireSweats.mp3", // Static file path
        file: "media/BloodFireSweats.mp3", // Static file path
      },
      {
        title: "GLifeTough",
        originalTrackName: "media/GLifeTough.mp3",
        img: "GLifeTough.jpg",
        name: "GLife Tough",
        artist: "Animate",
        genre: "Music",
        music: "media/GLifeTough.mp3", // Static file path
        file: "media/GLifeTough.mp3", // Static file path
      },
      {
        title: "Blame Me",
        originalTrackName: "media/BlameMe.mp3",
        img: "BlameMe.jpg",
        name: "Blame Me",
        artist: "Animate",
        genre: "Music",
        music: "media/BlameMe.mp3", // Static file path
        file: "media/BlameMe.mp3", // Static file path
      },
      {
        title: "Billz3nLatin",
        originalTrackName: "media/Billz3nLatin.mp3",
        img: "Billz3nLatin.jpg",
        name: "Billz3nLatin",
        artist: "Animate",
        genre: "Music",
        music: "media/Billz3nLatin.mp3", // Static file path
        file: "media/Billz3nLatin.mp3", // Static file path
      },
      {
        title: "Friendly Allaince",
        originalTrackName: "media/FriendlyAllaince.mp3",
        img: "FriendlyAllaince.jpg",
        name: "FriendlyAllaince",
        artist: "Animate",
        genre: "Music",
        music: "media/FriendlyAllaince.mp3", // Static file path
        file: "media/FriendlyAllaince.mp3", // Static file path
      },
      {
        title: "The Melodic Estavous",
        originalTrackName: "media/MelodicEstavous.mp3",
        img: "MelodicEstavous.jpg",
        name: "The Melodic Estavous",
        artist: "Animate",
        genre: "Music",
        music: "media/MelodicEstavous.mp3", // Static file path
        file: "media/MelodicEstavous.mp3", // Static file path
      },
      {
        title: "FM_Mute_E_Gtr",
        originalTrackName: "media/FM_Mute_E_Gtr.mp3",
        img: "FM_Mute_E_Gtr.jpg",
        name: "FM_Mute_E_Gtr",
        artist: "Animate",
        genre: "Music",
        music: "media/FM_Mute_E_Gtr.mp3", // Static file path
        file: "media/FM_Mute_E_Gtr.mp3", // Static file path
      },
      {
        title: "Hype",
        originalTrackName: "media/Hype.mp3",
        img: "Hype.jpg",
        name: "Hype",
        artist: "Animate",
        genre: "Music",
        music: "media/Hype.mp3", // Static file path
        file: "media/Hype.mp3", // Static file path
      },
      {
        title: "IkengaTrap",
        originalTrackName: "media/IkengaTrap.mp3",
        img: "IkengaTrap.jpg",
        name: "IkengaTrap",
        artist: "Animate",
        genre: "Music",
        music: "media/IkengaTrap.mp3", // Static file path
        file: "media/IkengaTrap.mp3", // Static file path
      },
      {
        title: "Lord I Thank You",
        originalTrackName: "media/Lord_I_Thank_You.mp3",
        img: "Lord_I_Thank_You.jpg",
        name: "Lord I Thank You",
        artist: "Animate",
        genre: "Music",
        music: "media/Lord_I_Thank_You.mp3", // Static file path
        file: "media/Lord_I_Thank_You.mp3", // Static file path
      },
      {
        title: "MelodicFire",
        originalTrackName: "media/MelodicFire.mp3",
        img: "MelodicFire.jpg",
        name: "MelodicFire",
        artist: "Animate",
        genre: "Music",
        music: "media/MelodicFire.mp3", // Static file path
        file: "media/MelodicFire.mp3", // Static file path
      },
      {
        title: "Ready For Something Magical",
        originalTrackName: "media/ReadyForSomethingMagical.mp3",
        img: "ReadyForSomethingMagical.jpg",
        name: "Ready For Something Magical",
        artist: "Animate",
        genre: "Music",
        music: "media/ReadyForSomethingMagical.mp3", // Static file path
        file: "media/ReadyForSomethingMagical.mp3", // Static file path
      },
      {
        title: "Sick Trap",
        originalTrackName: "media/SickTrap.mp3",
        img: "SickTrap.jpg",
        name: "Sick Trap",
        artist: "Animate",
        genre: "Music",
        music: "media/SickTrap.mp3", // Static file path
        file: "media/SickTrap.mp3", // Static file path
      },
      {
        title: "Flute Answers",
        originalTrackName: "media/FLUTE_ANSWERS.mp3",
        img: "FLUTE_ANSWERS.jpg",
        name: "Flute Answers",
        artist: "Animate",
        genre: "Music",
        music: "media/FLUTE_ANSWERS.mp3", // Static file path
        file: "media/FLUTE_ANSWERS.mp3", // Static file path
      },
      {
        title: "The Electric Mist",
        originalTrackName: "media/TheElectricMist.mp3",
        img: "TheElectricMist.jpg",
        name: "The Electric Mist",
        artist: "Animate",
        genre: "Music",
        music: "media/TheElectricMist.mp3", // Static file path
        file: "media/TheElectricMist.mp3", // Static file path
      },
      {
        title: "The Wood Stock",
        originalTrackName: "media/TheWoodStock.mp3",
        img: "TheWoodStock.jpg",
        name: "The Wood Stock",
        artist: "Animate",
        genre: "Music",
        music: "media/TheWoodStock.mp3", // Static file path
        file: "media/TheWoodStock.mp3", // Static file path
      },
      {
        title: "Touch Tha Ceilin",
        originalTrackName: "media/TouchThaCeilin.mp3",
        img: "TouchThaCeilin.jpg",
        name: "Touch Tha Ceilin",
        artist: "Animate",
        genre: "Music",
        music: "media/TouchThaCeilin.mp3", // Static file path
        file: "media/TouchThaCeilin.mp3", // Static file path
      },
    ];
  }

  getVideoList() {
    return [
      // Static Track
      {
        title: "logo_scene",
        originalTrackName: "logo_scene.mp4",
        name: "logo_scene",
        artist: "Ecool",
        genre: "Music",
        video: "videos/logo_scene.mp4", // Static file path
        file: "videos/logo_scene.mp4", // Static file path
      },
      // S3 Hosted Videos
      //...this.getDynamicS3Tracks(["SkyHigh.mp3", "OceanWaves.mp3"], "Electronic"), // Example tracks
    ];
  }

  getDynamicS3Tracks(fileNames, genre) {
    return fileNames.map((file) => ({
      title: file.replace(".mp3", ""), // Extract title
      originalTrackName: file,
      artist: "Various Artists", // Default artist (adjust dynamically if needed)
      genre: genre,
      file: `${this.baseUrl}${file}`, // Construct S3 URL
    }));
  }

  getCategorizedMusicList() {
    return this.musicList.reduce((categorized, track) => {
      if (!categorized[track.genre]) {
        categorized[track.genre] = [];
      }
      categorized[track.genre].push(track);
      return categorized;
    }, {});
  }

  getTrackByGenre(genre) {
    return this.musicTracks[genre] || [];
  }
}

export default MusicUtils;