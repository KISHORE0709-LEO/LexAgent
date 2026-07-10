import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";
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

// Realistic 20-25 page equivalent of dummy text for legal cases.
const generateDummyLegalText = (caseTitle, caseType, petitioner, respondent) => {
  const baseText = `
IN THE HIGH COURT OF JUDICATURE
ORIGINAL / APPELLATE JURISDICTION

CASE TITLE: ${caseTitle}
PETITIONER: ${petitioner}
RESPONDENT: ${respondent}
CASE TYPE: ${caseType.toUpperCase()}

1. BRIEF FACTS OF THE CASE:
The present petition/appeal is filed before this Hon'ble Court seeking relief under the applicable provisions of law. 
The dispute arose out of a series of events leading to the filing of the initial complaint/suit.
It is submitted that the Petitioner has been wrongfully aggrieved by the actions of the Respondent.

2. PROCEDURAL HISTORY:
The matter was initially heard in the lower court/tribunal where an impugned order was passed.
Aggrieved by the said order, the present proceedings have been initiated.
Multiple hearings have taken place and interim relief was sought but denied.

3. GROUNDS FOR APPEAL/PETITION:
a) The impugned order is bad in law and facts.
b) The principles of natural justice were violated as the Petitioner was not given a fair hearing.
c) The evidence on record was not appreciated correctly.
d) There is a patent error on the face of the record.

4. PRAYER:
In view of the facts and circumstances, it is most respectfully prayed that this Hon'ble Court may be pleased to:
a) Set aside the impugned order.
b) Grant interim protection/stay.
c) Pass any other order as deemed fit and proper in the interest of justice.

[DETAILED ARGUMENTS AND WITNESS STATEMENTS FOLLOW]
`;

  // Repeat the core argument text many times to simulate a very long document (approx 20-25 pages)
  const paragraph = `Furthermore, it is humbly submitted that the authorities completely ignored the documentary evidence presented as Annexure P-1 to P-5. The witness testimonies recorded during cross-examination clearly indicate contradictions in the prosecution/plaintiff's narrative. The reliance placed on the landmark judgment of the Apex Court in similar matters was arbitrarily dismissed by the lower forum. The statutory provisions clearly mandate a different interpretation than what was concluded. The balance of convenience strictly lies in favour of the Petitioner. `;
  
  let longText = baseText;
  for (let i = 0; i < 300; i++) {
    longText += `\n[Para ${i + 5}] ` + paragraph;
  }

  return longText;
};

const updateDatabase = async () => {
  try {
    console.log("Fetching all cases from Firestore...");
    const casesCollection = collection(db, 'cases');
    const snapshot = await getDocs(casesCollection);
    
    console.log(`Found ${snapshot.docs.length} cases. Updating with detailed case text...`);
    
    let updatedCount = 0;
    for (const document of snapshot.docs) {
      const data = document.data();
      const dummyText = generateDummyLegalText(
        data.title || 'Unknown Case',
        data.type || 'civil',
        data.petitioner || 'Petitioner',
        data.respondent || 'Respondent'
      );
      
      await updateDoc(doc(db, 'cases', document.id), {
        case_text: dummyText,
        // Remove old dummy URL references if needed, or replace them
        documents: [] // Clear existing dummy files since we are using case_text now
      });
      updatedCount++;
      if (updatedCount % 5 === 0) {
        console.log(`Updated ${updatedCount} cases...`);
      }
    }

    console.log(`Successfully updated all ${updatedCount} cases with realistic legal content.`);
    process.exit(0);
  } catch (error) {
    console.error("Error during database update:", error);
    process.exit(1);
  }
};

updateDatabase();
