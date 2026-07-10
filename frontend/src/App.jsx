import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import ProblemStatement from './components/ProblemStatement';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import Footer from './components/Footer';
import AuthPage from './components/AuthPage';
import Summarizer from './components/Summarizer';
import PrecedentFinder from './components/PrecedentFinder';
import ProfilePage from './components/ProfilePage';
import MandamusGuide from './components/MandamusGuide';
import FeaturesNavbar from './components/FeaturesNavbar';
import HowItWorksPage from './pages/HowItWorksPage';
import AboutPage from './pages/AboutPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MandamusProvider } from './context/MandamusContext';
import { HistoryProvider } from './context/HistoryContext';


const GlobalBackground = () => {
  const location = useLocation();
  const isFeatureRoute = ['/dashboard', '/public-dashboard', '/advisor', '/modern-advisor', '/vault', '/admin-dashboard', '/lawyer-dashboard'].some(path => location.pathname.startsWith(path));
  
  if (isFeatureRoute) return null;
  
  return (
    <div className="dynamic-bg" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0 }}>
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>
      <div className="grid-overlay"></div>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  // TEMP: bypass auth check for frontend dev
  return children;
};

const LandingPage = () => (
  <>
    <Navbar />
    <HeroSection />
    <ProblemStatement />
    <Features />
    <HowItWorks />
    <Footer />
  </>
);

const Dashboard = ({ activeFeature, setActiveFeature }) => {
  const renderContent = () => {
    switch (activeFeature) {
      case 'summariser':
        return <Summarizer onTabChange={setActiveFeature} />;
      case 'precedent':
        return <PrecedentFinder onTabChange={setActiveFeature} />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <Summarizer onTabChange={setActiveFeature} />;
    }
  };

  return (
    <div className="dashboard-container" style={{ paddingTop: '100px', minHeight: '100vh', background: '#000' }}>
      <FeaturesNavbar onSelectFeature={setActiveFeature} activeFeature={activeFeature} />
      {renderContent()}
    </div>
  );
};

function App() {
  const [activeFeature, setActiveFeature] = React.useState('summariser');

  return (
    <AuthProvider>
      <HistoryProvider>
        <MandamusProvider>
        <Router>
          <div className="app-container">
            <GlobalBackground />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/how-it-works" element={<HowItWorksPage />} />
                <Route path="/login" element={<AuthPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard activeFeature={activeFeature} setActiveFeature={setActiveFeature} />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<Navigate to="/" />} />

              </Routes>
            </div>
            
            <MandamusGuide activeFeature={activeFeature} />
          </div>
        </Router>
      </MandamusProvider>
      </HistoryProvider>
    </AuthProvider>
  );
}

export default App;
