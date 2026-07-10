import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar-wrapper ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="logo-container" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <img src="/Logo.png" alt="Mandamus Logo" className="logo-icon" />
        <span className="logo-text">MANDAMUS</span>
      </div>

      <div className="nav-capsule">
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/how-it-works">How it works</Link>
          <a href="/#features">Features</a>
          <Link to="/about">About</Link>
        </div>
      </div>

      <div className="nav-actions">
        <button className="btn-primary" style={{ borderRadius: '24px' }} onClick={() => navigate('/login')}>Sign In</button>
      </div>
    </nav>
  );
};

export default Navbar;

