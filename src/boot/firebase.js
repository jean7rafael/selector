// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, connectAuthEmulator } from 'firebase/auth';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

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

// TODO: fix code below so we don't need to call this manually like this
connectAuthEmulator(firebaseAuth, 'http://127.0.0.1:9099');

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
