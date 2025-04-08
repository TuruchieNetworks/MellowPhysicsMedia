import React from 'react';
import { Link } from 'react-router-dom';
import '../../App.css';

const NavBar = () => {
    const handleMenuClick = () => {
        const toggler = document.querySelector('.toggler');
        toggler.checked = false; // Uncheck the toggler to close the menu
    };
    return (
        <div className="menu-wrap">
            <input type="checkbox" className="toggler" />
            <div className="hamburger"><div></div></div>
            <div className="menu">
                <div>
                    <div>
                        <ul>
                            <li>
                                <Link to="/">
                                    <span className="fas fa-home" onClick={handleMenuClick}> Home</span>
                                </Link>
                            </li>
                            <li>
                                <Link to="/about">
                                    <span className="fas fa-user" onClick={handleMenuClick}> About</span>
                                </Link>
                            </li>
                            <li>
                                <Link to="/music">
                                    <span className="fas fa-music" onClick={handleMenuClick}> Music</span>
                                </Link>
                            </li>
                            <li>
                                <Link to="/services">
                                    <span className="fas fa-tools" onClick={handleMenuClick}> Services</span>
                                </Link>
                            </li>
                            <li>
                                <Link to="/merchandise">
                                    <span className="fas fa-box" onClick={handleMenuClick}> Merchandise</span>
                                </Link>
                            </li>
                            <li>
                                <Link to="/contact">
                                    <span className="fas fa-phone" onClick={handleMenuClick}> Contact</span>
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NavBar;
