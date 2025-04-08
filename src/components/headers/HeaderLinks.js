import React from 'react';
import { Link } from 'react-router-dom';
import HeaderTitle from './HeaderTitle';
//import '../../HeaderTitle.css';

const HeaderLinks = () => {
  return (
    <Link to="/landing" className='party-lights spreader headerTitle'>
        <HeaderTitle />
    </Link>
  );
};

export default HeaderLinks;
