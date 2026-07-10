import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, doc, setDoc } from "firebase/firestore";
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const JUDGES = [
  { email: 'kishoremurali0726@gmail.com', name: 'Judge Kishore Murali' },
  { email: 'chvsneha2310@gmail.com', name: 'Judge Sneha CHV' }
];

const generateMockCases = (judge, count) => {
  const cases = [];
  for (let i = 1; i <= count; i++) {
    const isCivil = Math.random() > 0.5;
    const isUndertrial = !isCivil && Math.random() > 0.3; // more likely if criminal
    cases.push({
      title: `${isCivil ? 'Civil Dispute' : 'State'} vs. Person ${i} (${judge.name.split(' ')[1]})`,
      type: isCivil ? 'civil' : 'criminal',
      petitioner: isCivil ? `Petitioner ${i}` : 'State',
      respondent: `Respondent ${i}`,
      filedDate: new Date(Date.now() - Math.random() * 10000000000).toISOString().split('T')[0],
      hearingDate: new Date(Date.now() + Math.random() * 5000000000).toISOString().split('T')[0],
      undertrial: isUndertrial,
      documentUrl: 'https://example.com/mock-document.pdf',
      status: 'assigned',
      assigned_judge_email: judge.email,
      assigned_judge_name: judge.name,
      createdAt: new Date(),
      createdBy: 'system_seeder'
    });
  }
  return cases;
};

const seedDatabase = async () => {
  try {
    console.log("Starting seeding process...");

    // 1. Ensure judges exist in 'users' collection (for the dropdown and assignment logic)
    for (const judge of JUDGES) {
      // Mock uid based on email (since we don't know their actual auth UID, we'll just create a doc or use email as ID)
      // Actually, standard app uses auth uid. The assign dropdown fetches from 'users' where role == 'judge'.
      // We will create dummy records in 'users' collection if they don't exist.
      const mockUid = `mock_uid_${judge.email.split('@')[0]}`;
      await setDoc(doc(db, 'users', mockUid), {
        email: judge.email,
        displayName: judge.name,
        role: 'judge',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log(`Ensured user record for judge: ${judge.email}`);
    }

    // 2. Generate and add cases
    const casesCollection = collection(db, 'cases');
    
    for (const judge of JUDGES) {
      console.log(`Generating cases for ${judge.name}...`);
      const cases = generateMockCases(judge, 15); // 15 cases each
      
      for (const caseData of cases) {
        await addDoc(casesCollection, caseData);
      }
      console.log(`Successfully added 15 cases for ${judge.name}`);
    }

    console.log("Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Error during seeding:", error);
    process.exit(1);
  }
};

seedDatabase();
