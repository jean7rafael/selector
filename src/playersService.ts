import { db } from './firebaseConfig';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { PlayerInter } from './pages/IndexPage';

export async function getPlayersService(): Promise<PlayerInter[]> {
  const snapshot = await getDocs(collection(db, "players"));
  return snapshot.docs.map(doc => ({
    id: doc.id,
    name: doc.data().name,
    position: doc.data().position,
    relevance: doc.data().relevance,
    selected: doc.data().selected ?? false,
    order: doc.data().order
  })) as Player[];
}

export async function addPlayer(playerData) {
  const docRef = await addDoc(collection(db, "players"), playerData);
  console.log("Document written with ID: ", docRef.id);
}

export async function getPlayers() {
  const snapshot = await getDocs(collection(db, "players"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function updatePlayer(playerId, updateData) {
  const playerRef = doc(db, "players", playerId);
  await updateDoc(playerRef, updateData);
}

export async function deletePlayer(playerId) {
  const playerRef = doc(db, "players", playerId);
  await deleteDoc(playerRef);
}
