import { db } from './firebase';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';

// ═══════════════════════════════════════════════════════════════════════
// USER OPERATIONS
// ═══════════════════════════════════════════════════════════════════════

export const createOrUpdateUser = async (userId, userData) => {
  await setDoc(doc(db, 'users', userId), {
    ...userData,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const getUser = async (userId) => {
  const docSnap = await getDoc(doc(db, 'users', userId));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

// ═══════════════════════════════════════════════════════════════════════
// CASE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════

export const createCase = async (caseData) => {
  const docRef = await addDoc(collection(db, 'cases'), {
    ...caseData,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getCase = async (caseId) => {
  const docSnap = await getDoc(doc(db, 'cases', caseId));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const getCasesByJudge = async (judgeId) => {
  const q = query(collection(db, 'cases'), where('judgeId', '==', judgeId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateCase = async (caseId, updates) => {
  await updateDoc(doc(db, 'cases', caseId), updates);
};

// ═══════════════════════════════════════════════════════════════════════
// HEARING OPERATIONS (Scheduler)
// ═══════════════════════════════════════════════════════════════════════

export const createHearing = async (hearingData) => {
  const caseId = hearingData.caseId;
  const docRef = doc(db, 'hearings', caseId);
  await setDoc(docRef, {
    ...hearingData,
    hearingId: hearingData.hearingId || 'HRG-' + Date.now(),
    status: 'scheduled',
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp() // merge: true handles this if we wanted, but we'll overwrite
  }, { merge: true });
  return caseId;
};

export const getHearing = async (hearingId) => {
  const docSnap = await getDoc(doc(db, 'hearings', hearingId));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const getHearingsByJudge = async (judgeId) => {
  const q = query(
    collection(db, 'hearings'),
    where('judgeId', '==', judgeId)
  );
  const snapshot = await getDocs(q);
  const hearings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  return hearings.sort((a, b) => {
    const dateA = a.scheduledDate || '';
    const dateB = b.scheduledDate || '';
    return dateB.localeCompare(dateA);
  });
};

export const getHearingsByCase = async (caseId) => {
  const q = query(
    collection(db, 'hearings'),
    where('caseId', '==', caseId)
  );
  const snapshot = await getDocs(q);
  const hearings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  return hearings.sort((a, b) => {
    const dateA = a.scheduledDate || '';
    const dateB = b.scheduledDate || '';
    return dateB.localeCompare(dateA);
  });
};

export const getHearingByRoomId = async (roomId) => {
  const q = query(collection(db, 'hearings'), where('roomId', '==', roomId));
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
};

export const updateHearing = async (hearingId, updates) => {
  await updateDoc(doc(db, 'hearings', hearingId), updates);
};

export const deleteHearing = async (hearingId) => {
  await deleteDoc(doc(db, 'hearings', hearingId));
};

// ═══════════════════════════════════════════════════════════════════════
// ROOM OPERATIONS (Virtual Hearing)
// ═══════════════════════════════════════════════════════════════════════

export const createRoom = async (roomData) => {
  const docRef = await addDoc(collection(db, 'rooms'), {
    ...roomData,
    status: 'waiting',
    participants: [],
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getRoom = async (roomId) => {
  const q = query(collection(db, 'rooms'), where('roomId', '==', roomId));
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
};

export const updateRoom = async (roomDocId, updates) => {
  await updateDoc(doc(db, 'rooms', roomDocId), updates);
};

export const subscribeToRoom = (roomId, callback) => {
  const q = query(collection(db, 'rooms'), where('roomId', '==', roomId));
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      callback({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
    }
  });
};

// ═══════════════════════════════════════════════════════════════════════
// PARTICIPANT OPERATIONS
// ═══════════════════════════════════════════════════════════════════════

export const addParticipant = async (participantData) => {
  const docRef = await addDoc(collection(db, 'participants'), {
    ...participantData,
    status: participantData.role === 'judge' ? 'admitted' : 'pending',
    joinedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const updateParticipantStatus = async (participantId, status) => {
  await updateDoc(doc(db, 'participants', participantId), { status });
};

export const subscribeToParticipantsByRoom = (roomId, callback) => {
  const q = query(collection(db, 'participants'), where('roomId', '==', roomId));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
};



// ═══════════════════════════════════════════════════════════════════════
// BIOMETRIC LOG OPERATIONS
// ═══════════════════════════════════════════════════════════════════════

export const logBiometricVerification = async (logData) => {
  await addDoc(collection(db, 'biometric_logs'), {
    ...logData,
    timestamp: serverTimestamp()
  });
};

export const getBiometricLogs = async (userId, hearingId) => {
  const q = query(
    collection(db, 'biometric_logs'),
    where('userId', '==', userId),
    where('hearingId', '==', hearingId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ═══════════════════════════════════════════════════════════════════════
// TRANSCRIPT OPERATIONS
// ═══════════════════════════════════════════════════════════════════════

export const createTranscript = async (hearingId) => {
  const docRef = await addDoc(collection(db, 'transcripts'), {
    hearingId,
    entries: [],
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const addTranscriptEntry = async (transcriptId, entry) => {
  const docRef = doc(db, 'transcripts', transcriptId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const entries = docSnap.data().entries || [];
    await updateDoc(docRef, {
      entries: [...entries, { ...entry, timestamp: new Date().toISOString() }]
    });
  }
};

export const getTranscript = async (hearingId) => {
  const q = query(collection(db, 'transcripts'), where('hearingId', '==', hearingId));
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
};

export const subscribeToTranscript = (hearingId, callback) => {
  const q = query(collection(db, 'transcripts'), where('hearingId', '==', hearingId));
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      callback({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
    }
  });
};

// ═══════════════════════════════════════════════════════════════════════
// RECORDING OPERATIONS
// ═══════════════════════════════════════════════════════════════════════

export const createRecording = async (recordingData) => {
  const docRef = await addDoc(collection(db, 'hearing_recordings'), {
    ...recordingData,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const updateRecording = async (recordingId, updates) => {
  await updateDoc(doc(db, 'hearing_recordings', recordingId), {
    ...updates,
    uploadedAt: serverTimestamp()
  });
};

export const getRecordingsByHearing = async (hearingId) => {
  const q = query(collection(db, 'hearing_recordings'), where('hearingId', '==', hearingId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
