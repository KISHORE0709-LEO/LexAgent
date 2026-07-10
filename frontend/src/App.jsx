import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import ProblemStatement from './components/ProblemStatement';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import Footer from './components/Footer';
import AuthPage from './components/AuthPage';
import AgentDashboard from './components/AgentDashboard';
import ProfilePage from './components/ProfilePage';
import MandamusGuide from './components/MandamusGuide';
import HowItWorksPage from './pages/HowItWorksPage';
import AboutPage from './pages/AboutPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MandamusProvider } from './context/MandamusContext';
import { HistoryProvider } from './context/HistoryContext';


const GlobalBackground = () => {
  const location = useLocation();
  const isHidden = ['/public-dashboard', '/advisor', '/modern-advisor', '/vault', '/admin-dashboard', '/lawyer-dashboard'].some(path => location.pathname.startsWith(path));
  
  if (isHidden) return null;
  
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
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', background: '#0a0915', color: '#fff', fontFamily: 'system-ui' }}>
        <div style={{ fontSize: '16px', fontWeight: '500', letterSpacing: '1px' }}>Verifying credentials...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
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

function App() {
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
                    <AgentDashboard />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<Navigate to="/" />} />

              </Routes>
            </div>
            
            
            <MandamusGuide />
          </div>
        </Router>
      </MandamusProvider>
      </HistoryProvider>
    </AuthProvider>
  );
}

export default App;
