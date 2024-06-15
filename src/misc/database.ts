import { db } from '../boot/firebase.js';
import { collection, addDoc, updateDoc, where } from 'firebase/firestore';

export interface Player {
  id: number;
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

/* export async function readPlayers() {
} */

export async function writePlayer(player: Player) {
  try {
    const docRef = await addDoc(collection(db, 'players'), player);
    console.log('Document written with id = ', docRef.id); 
  } catch (err) {
    console.log('llemos: error saving to firestore=', err);
  }
}

export async function updatePlayer(player: Player) {
  try {
    // TODO: Fix update statement below to update only the player with that specific id
    // const docRef = await updateDoc(db, 'players', player.id, player);
    console.log('Document written with id = ', docRef.id); 
  } catch (err) {
    console.log('llemos: error saving to firestore=', err);
  }
}

export async function writePlayers(players: Array<Player>) {
  try {
    const docRef = await addDoc(collection(db, 'players'), players);
    console.log('Document written with id = ', docRef.id); 
  } catch (err) {
    console.log('llemos: error saving to firestore=', err);
  }
}
