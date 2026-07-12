import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Initialize from localStorage so returning users skip the black screen
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRoleState] = useState(() => localStorage.getItem('userRole') || null);

  const setRole = (r) => {
    setRoleState(r);
    if (r) {
      localStorage.setItem('userRole', r);
    } else {
      localStorage.removeItem('userRole');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false); // ← unblock the UI immediately

      // Fetch role in the background — don't block the app on this
      if (currentUser) {
        getDoc(doc(db, 'users', currentUser.uid))
          .then((userDoc) => {
            setRole(userDoc.exists() ? (userDoc.data().role || 'citizen') : 'citizen');
          })
          .catch((error) => {
            console.warn("Could not fetch user role (offline?):", error.message);
            setRole('citizen'); // safe default
          });
      } else {
        setRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await auth.signOut();
      setRole(null);
      sessionStorage.clear();
      localStorage.clear();
      window.location.href = '/login';
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, role, setRole, logout }}>
      {/* Always render children — ProtectedRoute handles the loading state */}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
