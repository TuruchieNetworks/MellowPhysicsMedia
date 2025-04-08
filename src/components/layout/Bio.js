import React, { useEffect, useRef } from 'react';
import '../../App.css';
import BioHeader from '../headers/BioHeader';
const Biography = () => {
    return (
        <div className='bio-container'>
            <div className='bio-inner-container' style={{ fontSize: '14px' }}>
                <BioHeader />

                <div className='bio-content'>
                    ECool, known offstage as Ebianga Ikpeme, is an electrifying force in the world of Afrobeats, hailing from the vibrant streets of Lagos, Nigeria. His musical journey ignited at the young age of 17 as a DJ, and he has since evolved into a multifaceted artist—dancer, producer, entrepreneur, and comedian—all while radiating an infectious energy that captivates audiences.
                </div>

                <div className='bio-content'>
                    Before his monumental collaboration with global superstar Davido in 2016, ECool was already making waves in Atlanta, where he played a pivotal role in shaping the local Afrobeat scene. His reputation as one of the city's nightlife icons set the stage for a successful partnership with Davido, propelling him to international acclaim. As Davido's official DJ, ECool has rocked sold-out arenas across the globe, all while carving out his own musical identity with hit tracks like “Ada,” “4U,” and “Onome,” which feature powerhouse artists like Zlatan and Mayorkun.
                </div>

                <div className='bio-content'>
                    In his EP, New Side, ECool showcases his versatility as a producer, seamlessly fusing diverse global sounds into a cohesive and captivating experience. His track "ATL" serves as a heartfelt tribute to the city that embraced him, reflecting his dedication to advancing Afrobeat culture in the U.S.
                </div>

                <div className='bio-content'>
                    A proud member of the iconic Goodfellas crew, ECool is also the mastermind behind Ace Atlanta, one of the hottest nightlife spots in the city. When he’s not performing at major events or collaborating with renowned artists, he’s busy hosting unforgettable gatherings such as ECool & Friends, Beats & Keys, and Beats Outside, where he unites music lovers for nights filled with rhythm and joy.
                </div>

                <div className='bio-content'>
                    As a dynamic trendsetter in the Afrobeats landscape, ECool continually pushes the boundaries of creativity and innovation. With a growing catalog of infectious tracks and an innate ability to connect with audiences, he’s not just shaping the future of music—he’s defining it, one beat at a time.
                </div>
            </div>
        </div>
    );
};

export default Biography;
