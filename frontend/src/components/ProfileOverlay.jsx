import React from 'react';
import { 
  User, 
  Settings, 
  Shield, 
  LogOut, 
  Bell,
  Activity,
  ChevronRight
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import './ProfileOverlay.css';

const ProfileOverlay = ({ isOpen, onClose, user }) => {
  if (!isOpen) return null;

  const { logout } = useAuth();
  
  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="profile-overlay-backdrop" onClick={onClose}>
      <div className="profile-card-glow" onClick={(e) => e.stopPropagation()}>
        <div className="profile-header">
          <div className="profile-avatar-large">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" />
            ) : (
              <User size={32} />
            )}
          </div>
          <div className="profile-info-main">
            <h3 className="user-name">{user?.displayName || 'Judicial Officer'}</h3>
            <p className="user-role">Magistrate · District Court</p>
          </div>
        </div>

        <div className="profile-stats">
          <div className="stat-item">
            <span className="stat-val">124</span>
            <span className="stat-label">CASES</span>
          </div>
          <div className="stat-item">
            <span className="stat-val">89%</span>
            <span className="stat-label">EFFICIENCY</span>
          </div>
          <div className="stat-item">
            <span className="stat-val">12</span>
            <span className="stat-label">PENDING</span>
          </div>
        </div>

        <div className="profile-menu">
          <button className="menu-item">
            <Settings size={18} />
            <span>Account Settings</span>
            <ChevronRight size={16} className="menu-chevron" />
          </button>
          <button className="menu-item">
            <Shield size={18} />
            <span>Security & Privacy</span>
            <ChevronRight size={16} className="menu-chevron" />
          </button>
          <button className="menu-item">
            <Bell size={18} />
            <span>Notifications</span>
            <span className="menu-badge">3</span>
          </button>
          <button className="menu-item">
            <Activity size={18} />
            <span>Workload Insights</span>
            <ChevronRight size={16} className="menu-chevron" />
          </button>
        </div>

        <div className="profile-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Terminate Session</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileOverlay;
