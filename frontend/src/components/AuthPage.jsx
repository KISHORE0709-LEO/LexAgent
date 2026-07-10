import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import './AuthPage.css';

const AuthPage = () => {
  const [authMode, setAuthMode] = useState('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const toggleMode = () => {
    setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
    setErrors({});
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrors({});
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/dashboard');
    } catch (error) {
      console.error("Google sign in error", error);
      setErrors({ google: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const { fullName, email, password } = formData;
    
    // Basic validation
    const validationErrors = {};
    if (authMode === 'signup' && !fullName.trim()) {
      validationErrors.fullName = 'Full name is required';
    }
    if (!email.trim()) {
      validationErrors.email = 'Email is required';
    }
    if (!password.trim()) {
      validationErrors.password = 'Password is required';
    }
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsLoading(false);
      return;
    }

    try {
      if (authMode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: fullName
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/dashboard');
    } catch (error) {
      console.error("Auth error", error);
      setErrors({ auth: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-centered-container">
        <div className="auth-card-large">
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
              <img src="/Logo.png" alt="Mandamus Logo" style={{ height: '40px' }} />
              <span style={{ fontSize: '24px', fontWeight: '800', color: '#fff', letterSpacing: '3px' }}>MANDAMUS</span>
            </div>
            <div className="secure-badge">
              <ShieldCheck size={12} />
              SECURE ACCESS
            </div>
            <h2 className="auth-title" style={{ fontSize: '28px', marginBottom: '8px' }}>
              {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="auth-subtitle" style={{ fontSize: '14px' }}>
              {authMode === 'signin' ? 'Sign in to access the Mandamus platform.' : 'Register to get started with Mandamus.'}
            </p>
          </div>

          {/* Google Sign-In */}
          <button className="google-btn" onClick={handleGoogleSignIn} disabled={isLoading}>
            <svg viewBox="0 0 48 48" className="google-icon" xmlns="http://www.w3.org/2000/svg">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            {isLoading ? 'Connecting...' : 'Continue with Google'}
          </button>

          {errors.google && <div className="auth-error-main" style={{ marginBottom: '16px' }}>{errors.google}</div>}
          {errors.auth && <div className="auth-error-main" style={{ marginBottom: '16px' }}>{errors.auth}</div>}

          <div className="auth-divider">
            <span className="divider-line"></span>
            <span className="divider-text">OR EMAIL</span>
            <span className="divider-line"></span>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {authMode === 'signup' && (
              <div className="input-group">
                <input
                  type="text" name="fullName" placeholder="Full Name"
                  className={`auth-input ${errors.fullName ? 'input-error' : ''}`}
                  value={formData.fullName} onChange={handleChange}
                  autoComplete="name"
                />
                {errors.fullName && <div className="error-msg">{errors.fullName}</div>}
              </div>
            )}

            <div className="input-group">
              <input
                type="email" name="email" placeholder="Email Address"
                className={`auth-input ${errors.email ? 'input-error' : ''}`}
                value={formData.email} onChange={handleChange}
                autoComplete="email"
              />
              {errors.email && <div className="error-msg">{errors.email}</div>}
            </div>

            <div className="input-group">
              <input
                type="password" name="password" placeholder="Password"
                className={`auth-input ${errors.password ? 'input-error' : ''}`}
                value={formData.password} onChange={handleChange}
                autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
              />
              {errors.password && <div className="error-msg">{errors.password}</div>}
              {authMode === 'signin' && (
                <div className="forgot-password"><a href="#forgot">Forgot?</a></div>
              )}
            </div>

            <button type="submit" className="auth-submit-btn" disabled={isLoading}>
              {isLoading ? <span className="btn-spinner"></span> : (authMode === 'signin' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="auth-toggle">
            {authMode === 'signin' ? (
              <>Don't have an account? <span className="toggle-link" onClick={toggleMode}>Sign Up</span></>
            ) : (
              <>Already have an account? <span className="toggle-link" onClick={toggleMode}>Sign In</span></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
