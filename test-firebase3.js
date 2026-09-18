import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
}, firebaseConfig.firestoreDatabaseId);
console.log("Success");
