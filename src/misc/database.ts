import { db } from '../boot/firebase.js';
import { collection, addDoc, updateDoc, where, query, getDocs, writeBatch, doc } from 'firebase/firestore';

export interface Player {
  id: string;
  name: string;
  position: string;
  relevanciaBase: number;
  relevanciaCalc: number;
  gender: 'Homem' | 'Mulher';
  selected: boolean;
  order: number;
  pass: number;
  attack: number;
  positioning: number;
  block: number;
  serve: number;
}

const collections = {
  players: 'players'
};

/* export async function readPlayers() {
} */

export async function writePlayer(player: Player) {
  try {
    const docRef = await addDoc(collection(db, collections.players), player);
    return docRef.id;
  } catch (err) {
    console.log('llemos: error saving to firestore=', err);
  }
}

export async function updatePlayerOnFirestore(player: Player) {
  try {
    // TODO: If we have the `documentId` we can do an `updateDoc()` right away
    // It might be worth storing it on `Player interface`
    const q = query(collection(db, collections.players), where('id', '==', player.id));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.size > 1) {
      return Promise.reject(`Ao atualizar jogador com id=${player.id}, encontrou-se mais de um jogador com este id no banco de dados. Parando atualização`);
    }

    querySnapshot.forEach(async doc => {
      await updateDoc(doc.ref, {
        ...player
      });
    });
  } catch (err) {
    console.log('llemos: error saving to firestore=', err);
  }
}

export async function overwritePlayers(players: Array<Player>) {
  try {
    players.forEach(async player => {
      await addDoc(collection(db, collections.players), player)
    })
  } catch (err) {
    console.log('llemos: error saving all players to firestore=', err);
  }
}

export async function readPlayers() {
    const q = query(collection(db, collections.players));
    const querySnapshot = await getDocs(q);
    const players: Array<Player> = [];
    querySnapshot.forEach(doc => {
      const data = doc.data() as Player;
      players.push({...data, id: doc.id});
    });
    return players;
}


