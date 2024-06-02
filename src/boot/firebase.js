// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, connectAuthEmulator } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  appId: process.env.FIREBASE_APP_ID,
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(firebaseApp);

if (process.env.DEBUGGING) {
  // This will be stripped out unless running `quasar dev` or `quasar build --debug`
  // More info on: https://quasar.dev/quasar-cli-vite/handling-process-env#values-provided-by-quasar-cli
  connectAuthEmulator(firebaseAuth, 'http://127.0.0.1:9099');
  console.log('Connected to local Firebase Auth Emulator');
}

async function getCurrentUser() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(firebaseAuth, user => {
      if (user) {
        resolve(user);
      } else {
        reject(null);
      }
    })
  });
}

export { firebaseApp, firebaseAuth, getCurrentUser };
