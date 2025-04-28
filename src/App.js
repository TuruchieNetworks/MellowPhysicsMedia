import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/layout/NavBar';
import About from './components/layout/About';
import Contact from './components/auth/Contact';
import Landing from './components/layout/Landing';
import Services from './components/auth/Services';
import Merchandise from './components/auth/Merchandise';
import Music from './components/auth/Music';
import './App.css';

function App() {
  return ( 
    <div style={{height: '100%'}}>
      <NavBar />
      <Routes>
        <Route exact path='/' element={<Navigate to='/Landing' />} />
        <Route exact path='/Landing' element={ <Landing /> } />
        <Route exact path='/About' element={ <About /> } />
        <Route exact path='/Music' element={ <Music /> } />
        <Route exact path='/Contact' element={ <Contact /> } />
        <Route exact path='/Services' element={ <Services /> } />
        <Route exact path='/Merchandise' element={ <Merchandise /> } />
      </Routes>
    </div>
  );
}

export default App;