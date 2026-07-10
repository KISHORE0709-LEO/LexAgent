import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export const initializeSuperAdmin = async () => {
  const adminEmail = "admin@mandamus.gov";
  const adminPassword = "MandamusAdmin2026!";
  const adminUID = "super_admin_id"; // Consistent ID for the super admin

  console.log("Checking for super admin existence...");

  try {
    // Check if admin doc exists in Firestore first
    const adminDoc = await getDoc(doc(db, 'users_by_email', adminEmail.toLowerCase()));
    
    if (adminDoc.exists()) {
      console.log("Super admin already exists in record.");
      return;
    }

    console.log("Initializing Super Admin...");

    // Try to create the user in Auth
    let user;
    try {
      const cred = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
      user = cred.user;
      console.log("Admin Auth account created.");
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log("Admin Auth account already exists. Signing in to verify...");
        const cred = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        user = cred.user;
      } else {
        throw error;
      }
    }

    // Save to Firestore
    await setDoc(doc(db, 'users', user.uid), {
      displayName: "Super Admin",
      email: adminEmail,
      role: "admin",
      createdAt: new Date().toISOString()
    }, { merge: true });

    await setDoc(doc(db, 'users_by_email', adminEmail.toLowerCase()), {
      role: "admin",
      uid: user.uid
    }, { merge: true });

    console.log("Super admin initialized successfully!");
    console.log("Credentials: ", adminEmail, " / ", adminPassword);

  } catch (error) {
    console.error("Failed to initialize super admin:", error);
  }
};
