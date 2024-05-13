// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyBxRYTZNsPMYopXOYoo4oKP3oDDXul1GNk',
  authDomain: 'banco-de-dados-seletor-times.firebaseapp.com',
  projectId: 'banco-de-dados-seletor-times',
  storageBucket: 'banco-de-dados-seletor-times.appspot.com',
  messagingSenderId: '984050813264',
  appId: '1:984050813264:web:65b421ac3e82a57530c455'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export { db };