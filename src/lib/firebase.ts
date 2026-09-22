import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, googleProvider, signInWithPopup, signOut, signInAnonymously };
