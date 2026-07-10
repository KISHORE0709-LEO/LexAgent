import React from 'react';
import Navbar from '../components/Navbar';
import About from '../components/About';
import Footer from '../components/Footer';

const AboutPage = () => {
    return (
        <div className="about-page-wrapper">
            <Navbar />
            <About />
            <Footer />
        </div>
    );
};

export default AboutPage;
