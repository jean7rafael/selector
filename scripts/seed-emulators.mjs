process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';
process.env.GCLOUD_PROJECT ||= 'demo-selector';

/* ===========================================================
   PROTEÇÃO CONTRA CARGA NO PROJETO REAL

   O script apaga e recria atletas; por isso se recusa a executar
   quando o destino não é explicitamente localhost.
=========================================================== */

if (!process.env.FIRESTORE_EMULATOR_HOST.startsWith('127.0.0.1') && !process.env.FIRESTORE_EMULATOR_HOST.startsWith('localhost')) {
  throw new Error('A carga inicial só pode ser executada contra o emulador local.');
}

const { initializeApp } = await import('firebase-admin/app');
const { getAuth } = await import('firebase-admin/auth');
const { getFirestore, Timestamp } = await import('firebase-admin/firestore');

const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const auth = getAuth(app);
const firestore = getFirestore(app);

/* Contas previsíveis exercitam os três níveis de permissão. */
const users = [
  { email: 'admin@selector.local', password: 'selector123', displayName: 'Admin local', role: 'admin' },
  { email: 'diretoria@selector.local', password: 'selector123', displayName: 'Diretoria local', role: 'director' },
  { email: 'membro@selector.local', password: 'selector123', displayName: 'Membro local', role: 'member' },
];

/* Cria ou atualiza as contas sem acumular duplicatas entre execuções. */
for (const seed of users) {
  let user;
  try {
    user = await auth.getUserByEmail(seed.email);
    await auth.updateUser(user.uid, { password: seed.password, displayName: seed.displayName });
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    user = await auth.createUser(seed);
  }
  await auth.setCustomUserClaims(user.uid, { role: seed.role });
  await firestore.doc(`users/${user.uid}`).set({
    email: seed.email,
    displayName: seed.displayName,
    role: seed.role,
    updatedAt: Timestamp.now(),
  }, { merge: true });
}

/* O elenco pequeno permite formar dois times logo após iniciar o app. */
const playerSeeds = [
  ['ana', 'Ana', 'Levantador', 'Mulher', 1000],
  ['bia', 'Bia', 'Ponteiro', 'Mulher', 500],
  ['clara', 'Clara', 'Central', 'Mulher', 100],
  ['davi', 'Davi', 'Oposto', 'Homem', 50],
  ['edu', 'Edu', 'Líbero', 'Homem', 10],
  ['fabio', 'Fábio', 'Ponteiro', 'Homem', 500],
  ['gabi', 'Gabi', 'Central', 'Mulher', 100],
  ['heitor', 'Heitor', 'Levantador', 'Homem', 1000],
  ['igor', 'Igor', 'Oposto', 'Homem', 50],
  ['julia', 'Júlia', 'Ponteiro', 'Mulher', 500],
  ['kaio', 'Kaio', 'Central', 'Homem', 100],
  ['luiza', 'Luiza', 'Líbero', 'Mulher', 10],
];

/* IDs determinísticos tornam a carga repetível e fácil de inspecionar. */
const existingPlayers = await firestore.collection('players').listDocuments();
const batch = firestore.batch();
existingPlayers.forEach((reference) => batch.delete(reference));
playerSeeds.forEach(([id, name, position, gender, relevanciaBase], index) => {
  batch.set(firestore.doc(`players/${id}`), {
    name,
    position,
    gender,
    relevanciaBase,
    relevanciaCalc: Number(relevanciaBase),
    order: index + 1,
    pass: 0,
    attack: 0,
    positioning: 0,
    block: 0,
    serve: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
});
await batch.commit();

console.log('Emuladores carregados: 3 usuários, 12 atletas.');
console.log('Admin local: admin@selector.local / selector123');
