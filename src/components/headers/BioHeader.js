import React from 'react';
import { useNavigate } from 'react-router-dom';

const BioHeader = () => {
    const navigate = useNavigate();
    const setDynamicRoute = () => {
        navigate('/');
    };
    return (
            <h2 className="headerTitle" onClick={setDynamicRoute}>
                <span className="bright-cover spreader type-writer">
                    <span className="spreader bright-cover type-writer leadShowcase">
                        ECool: The Number 1 Future of Afrobeats
                    </span> 
                    <span> 🎶 </span>
                    <span className="fas fa-drum"></span>
                </span>
            </h2>
    );
};

export default BioHeader;
