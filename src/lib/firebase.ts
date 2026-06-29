import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Use the custom firestoreDatabaseId created by the platform
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || "(default)");
