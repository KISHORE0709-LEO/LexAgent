import React from 'react';
import { User, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMandamus } from '../context/MandamusContext';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import './FeaturesNavbar.css';

const FeaturesNavbar = ({ onSelectFeature, activeFeature }) => {
  const { user, logout, role } = useAuth();
  const { state } = useMandamus();
  const navigate = useNavigate();

  const isFeatureComplete = (id) => {
    switch (id) {
      case 'summariser': return state.summariser_status === 'complete';
      case 'precedent': return state.selected_precedents && state.selected_precedents.length > 0;
      case 'draft': return state.draft_status === 'approved';
      case 'scheduler': return state.scheduler_status === 'scheduled';
      case 'virtual': return state.virtual_hearing_status === 'active';
      default: return false;
    }
  };

  const features = [
    { id: 'summariser', name: 'Summariser' },
    { id: 'precedent', name: 'Precedent Finder' },
  ];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="features-nav-wrapper">
      {/* Left: Logo */}
      <div className="features-logo" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
        <img src="/Logo.png" alt="Mandamus Logo" className="features-logo-icon" />
        <span className="features-logo-text">MANDAMUS</span>
      </div>

      {/* Center: Feature nav capsule */}
      <nav className="features-capsule">
        {features.map((feature) => (
          <div key={feature.id} style={{ position: 'relative', display: 'inline-flex', justifyContent: 'center' }}>
            <button
              onClick={() => onSelectFeature(feature.id)}
              className={`feature-link ${activeFeature === feature.id ? 'active' : ''}`}
            >
              {feature.name}
            </button>
            {isFeatureComplete(feature.id) && (
              <div style={{ position: 'absolute', bottom: '6px', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#00ff00', boxShadow: '0 0 5px #00ff00' }} />
            )}
          </div>
        ))}
      </nav>

      {/* Right: User actions (outside capsule) */}
      <div className="features-user-actions">
        <button className="action-icon-btn" title="Notifications">
          <Bell size={20} />
          <span className="action-badge" />
        </button>

        <button
          className={`profile-toggle-btn ${activeFeature === 'profile' ? 'active' : ''}`}
          onClick={() => onSelectFeature('profile')}
          title="Profile"
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt="User" className="nav-avatar" />
          ) : (
            <User size={20} />
          )}
        </button>

        <button className="logout-btn" onClick={handleLogout} title="Logout">
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default FeaturesNavbar;
