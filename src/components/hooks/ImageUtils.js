import sun from '../../galaxy_imgs/sun.jpg';
import mars from '../../galaxy_imgs/mars.jpg';
import mercury from '../../galaxy_imgs/mercury.jpg';
import earth from '../../galaxy_imgs/earth.jpg';
import venus from '../../galaxy_imgs/venus.jpg';
import uranus from '../../galaxy_imgs/uranus.jpg';
import neptune from '../../galaxy_imgs/neptune.jpg';
import saturn from '../../galaxy_imgs/saturn.jpg';
import jupiter from '../../galaxy_imgs/jupiter.jpg';
import pluto from '../../galaxy_imgs/pluto.jpg';
import nebula from '../../galaxy_imgs/nebula.jpg';
import stars from '../../galaxy_imgs/stars.jpg';

// Concert Images
import landing_dj from '../../img/landing_dj.jpg';
import blue_landing from '../../img/blue_landing.jpg';
import blue_concert from '../../img/blue_concert.jpg';
import metal_blocks from '../../img/metal_blocks.jpg';
import vasil_guitar from '../../img/vasil_guitar.jpg';
import globe_concert from '../../img/globe_concert.jpg';
import crowd_angle from '../../img/angle_outdoor_concerts.jpg';
import purple_crowd from '../../img/purple_crowd.jpg';
import angle_outdoor_concerts from '../../img/angle_outdoor_concerts.jpg';
import bright_stage from '../../img/tube_concerts.avif';
import blue_stage from '../../img/blue_stage_entrance.avif';
import dark_greece from '../../img/dark-greece.avif';
import tube_concerts from '../../img/tube_concerts.avif';
import concert_lights from '../../img/bright-concert-lights.avif';
import boy_on_guitars from '../../img/boy_on_electric_guitars.avif';

// GLTFs
import monkeyURL from '../../GLTFs/monkey.glb';

// FBXs
import DancingTwerk from '../../FBXs/DancingTwerk.fbx';

class ImageUtils {
    constructor() {
        this.images = {
            concerts: [
                landing_dj,
                blue_landing,
                globe_concert,
                metal_blocks,
                vasil_guitar,
                crowd_angle,
                purple_crowd,
                blue_concert,
                concert_lights,
                crowd_angle,
                blue_stage,
                tube_concerts,
                dark_greece,
                bright_stage,
                boy_on_guitars,
                angle_outdoor_concerts
            ],

            galaxies: [
                sun,
                stars,
                mercury,
                venus,
                uranus,
                pluto,
                mars,
                venus,
                earth,
                saturn,
                nebula,
                jupiter,
            ],

            gltfModels: [
                monkeyURL,
            ],

            fbxModels: [
                DancingTwerk,
            ],
        };
        this.loadConcert();
        this.loadGalaxyImages();
    }

    loadGalaxyImages() {
        this.sun =  sun;
        this.mars = mars;
        this.mercury = mercury;
        this.earth = earth;
        this.venus = venus;
        this.uranus = uranus;
        this.neptune = neptune;
        this.saturn = saturn;
        this.jupiter = jupiter;
        this.pluto = pluto;
        this.nebula = nebula;
        this.stars = stars;
    }

    loadConcert() {
        this.monkeyURL = monkeyURL;
        this.landing_dj = landing_dj;
        this.crowd_angle = crowd_angle;
        this.blue_landing = blue_landing;
        this.metal_blocks = metal_blocks;
        this.vasil_guitar = vasil_guitar;
        this.purple_crowd = purple_crowd;
        this.blue_concert = blue_concert;
        this.globe_concert = globe_concert;
        this.crowd_angle = crowd_angle;
        this.blue_stage = blue_stage;
        this.tube_concerts = tube_concerts;
        this.dark_greece = dark_greece;
        this.bright_stage = bright_stage;
        this.concert_lights = concert_lights;
        this.boy_on_guitars = boy_on_guitars;
        this.angle_outdoor_concerts = angle_outdoor_concerts;
    }

    // Method to get a random image from a specified category
    getRandomImage(category = 'concerts') {
        const categoryImages = this.images[category];
        if (categoryImages && categoryImages.length > 0) {
            const randomIndex = Math.floor(Math.random() * categoryImages.length);
            return categoryImages[randomIndex];
        }
        return null; // Return null if category is not found or has no images
    }

    // Method to get all images from a specified category
    getAllImages(category = 'concerts') {
        return this.images[category] || []; // Return an empty array if category not found
    }

    // Method to get all images from a specified category
    getAllConcertImages() {
        return this.images['concerts'] || []; // Return an empty array if category not found
    }

    // Method to get all images from a specified category
    getAllGalaxialImages() {
        return this.images['galaxies'] || []; // Return an empty array if category not found
    }
}

export default ImageUtils;
