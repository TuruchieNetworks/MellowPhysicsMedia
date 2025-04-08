import { useState, useEffect } from 'react';

const useUIEvents = (trackIndex, musicList) => {
  const [dynamicLeadClasses, setDynamicLeadClasses] = useState('lead purple-circle-container');
  const [logoLeads, setLogoLeads] = useState('🎶MELODY DREAMS🎶');
  const [cardClass, setCardClass] = useState('dark-glow bluebtn box-shadow');
  const [dynamicMessage, setDynamicMessage] = useState('');

  const toggleLogo = (track) => {
    if (!track) return;
    setDynamicLeadClasses((prev) =>
      prev === 'lead purple-circle-container bluebtn' 
        ? 'leadShowcase purple-circle-container' 
        : 'lead purple-circle-container bluebtn'
    );
    setLogoLeads(`🎶 PLAYING: ${track.name || 'Unknown Title'} by ${track.artist || 'Unknown Artist'}`);
  };

  const updateInfoCard = (track) => {
    if (!track) return;
    setDynamicMessage(`Now Playing: ${track.name || 'Unknown Title'} by ${track.artist || 'Unknown Artist'}`);
    setCardClass('leadShowcase bluebtn dark-glow');
  };

  const landingHover = (e) => {
    if (e.target.innerText === '🎶MELODY DREAMS🎶') {
      setLogoLeads(`🎶 PLAYING: ${trackIndex + 1} of ${musicList.length}🎶`)
      setDynamicLeadClasses("lead purple-circle-containe bluebtn")
    }
    else if (e.target.innerText === `🎶 PLAYING: ${trackIndex + 1} of ${musicList.length}🎶`) {
      setLogoLeads('🎶MELODY DREAMS🎶')
      setDynamicLeadClasses("leadShowcase purple-circle-container")
    }

    return e
  }

  return { 
    dynamicLeadClasses,
    logoLeads,
    cardClass,
    dynamicMessage,
    toggleLogo,
    updateInfoCard,
    setLogoLeads,
    setDynamicLeadClasses,
    landingHover
  };
};

export default useUIEvents;
