import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDvFBsMb9D_027-IWJfmhwmhIzStwiFzJ4",
  authDomain: "mindmirrorai.firebaseapp.com",
  projectId: "mindmirrorai",
  storageBucket: "mindmirrorai.firebasestorage.app",
  messagingSenderId: "67489970161",
  appId: "1:67489970161:web:2e49f57a35b9fa95907650"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Use the custom firestoreDatabaseId created by the platform
export const db = getFirestore(app, "ai-studio-deadlineheroai-b25989d6-eca3-4700-895e-535a1ea00128");
