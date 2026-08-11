import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

/* ===========================================================
   CONFIGURAÇÃO DO FIREBASE

   As chaves de um aplicativo Web identificam o projeto, mas não
   substituem as regras de segurança. O controle de acesso real
   permanece em firestore.rules.
=========================================================== */

const projectId = process.env.FIREBASE_PROJECT_ID || 'demo-selector';
const firebaseConfig = {
  projectId,
  appId: process.env.FIREBASE_APP_ID || '1:123456789:web:selector-local',
  apiKey: process.env.FIREBASE_API_KEY || 'selector-local-api-key',
  authDomain:
    process.env.FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '123456789',
};

const firebaseApp = initializeApp(firebaseConfig);

/* O aplicativo usa e-mail e senha, sem login por pop-up ou redirecionamento.
   Declarar somente as persistências evita que o Firebase carregue o resolvedor
   Cordova no iOS, onde essa inicialização extra bloqueava a primeira rota. */
const firebaseAuth = initializeAuth(firebaseApp, {
  persistence: [
    indexedDBLocalPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
  ],
  popupRedirectResolver: undefined,
});
const db = getFirestore(firebaseApp);
const cloudFunctions = getFunctions(firebaseApp);

/* ===========================================================
   CONEXÃO AUTOMÁTICA AOS EMULADORES

   O modo de desenvolvimento nunca deve gravar dados por engano
   no projeto real. O try/catch também tolera recarga a quente.
=========================================================== */

if (process.env.DEBUGGING || process.env.FIREBASE_USE_EMULATORS === 'true') {
  try {
    connectAuthEmulator(firebaseAuth, 'http://127.0.0.1:9099', {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectFunctionsEmulator(cloudFunctions, '127.0.0.1', 5001);
  } catch (error) {
    if (!String(error).includes('already')) throw error;
  }
}

/* Aguarda a primeira resposta do Firebase Auth antes de afirmar
   se existe ou não uma sessão autenticada. */
async function getCurrentUser() {
  await firebaseAuth.authStateReady();
  if (!firebaseAuth.currentUser) throw new Error('Usuário não autenticado.');
  return firebaseAuth.currentUser;
}

export { cloudFunctions, firebaseApp, firebaseAuth, getCurrentUser, db };
