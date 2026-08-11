import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from 'src/boot/firebase';
import {
  normalizePlayer,
  playerToDocument,
  type Player,
} from 'src/domain/player';

export type { Player } from 'src/domain/player';

/* ===========================================================
   REPOSITÓRIO DE ATLETAS

   Este arquivo concentra todo o acesso à coleção players. As
   páginas cuidam da interface; as regras cuidam da autorização.
=========================================================== */

const playersCollection = collection(db, 'players');

/* Cria um documento novo e devolve o identificador gerado pelo Firestore. */
export async function writePlayer(player: Player): Promise<string> {
  const document = await addDoc(playersCollection, {
    ...playerToDocument(player),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return document.id;
}

/* Atualiza diretamente pelo document ID, evitando a antiga busca
   por um campo id que nem sempre existia no documento. */
export async function updatePlayerOnFirestore(player: Player): Promise<void> {
  if (!player.id) throw new Error('O atleta não possui um identificador do Firestore.');
  await updateDoc(doc(db, 'players', player.id), {
    ...playerToDocument(player),
    updatedAt: serverTimestamp(),
  });
}

/* Exclusões individual e em lote compartilham a mesma coleção. */
export async function deletePlayerFromFirestore(playerId: string): Promise<void> {
  if (!playerId) return;
  await deleteDoc(doc(db, 'players', playerId));
}

export async function deletePlayersFromFirestore(playerIds: string[]): Promise<void> {
  const batch = writeBatch(db);
  playerIds.filter(Boolean).forEach((playerId) => batch.delete(doc(db, 'players', playerId)));
  await batch.commit();
}

/* A importação é uma substituição atômica: ou o lote inteiro é
   gravado, ou o cadastro anterior continua intacto. */
export async function overwritePlayers(players: Player[]): Promise<void> {
  const current = await getDocs(playersCollection);
  const batch = writeBatch(db);
  current.docs.forEach((snapshot) => batch.delete(snapshot.ref));

  players.forEach((player, index) => {
    const reference = doc(playersCollection);
    const normalized = normalizePlayer(reference.id, player, index + 1);
    batch.set(reference, {
      ...playerToDocument(normalized),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

/* Leitura pontual usada por rotinas administrativas e testes. */
export async function readPlayers(): Promise<Player[]> {
  const snapshot = await getDocs(query(playersCollection, orderBy('order')));
  return snapshot.docs.map((document, index) =>
    normalizePlayer(document.id, document.data() as Partial<Player>, index + 1),
  );
}

/* O listener em tempo real mantém mais de um aparelho sincronizado
   e devolve uma função de cancelamento para evitar vazamentos. */
export function subscribeToPlayers(
  onPlayers: (players: Player[]) => void,
  onError?: (error: Error) => void,
) {
  return onSnapshot(
    query(playersCollection, orderBy('order')),
    (snapshot) => {
      onPlayers(
        snapshot.docs.map((document, index) =>
          normalizePlayer(document.id, document.data() as Partial<Player>, index + 1),
        ),
      );
    },
    (error) => onError?.(error),
  );
}
