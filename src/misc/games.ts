import type { User } from 'firebase/auth';
import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from 'src/boot/firebase';

export type AttendanceStatus = 'going' | 'maybe' | 'not_going';

/* ===========================================================
   MODELOS DE JOGOS, PRESENÇAS E PESSOAS REPRESENTADAS
=========================================================== */

export interface Game {
  id: string;
  title: string;
  location: string;
  startsAt: Date;
  notes: string;
  createdBy: string;
}

export interface Attendance {
  userId: string;
  displayName: string;
  playerId: string;
  playerName: string;
  status: AttendanceStatus;
  respondedByUid: string;
}

export interface PresenceSubject {
  uid: string;
  displayName: string;
  playerId: string;
  playerName: string;
}

/* ===========================================================
   AGENDA EM TEMPO REAL

   A consulta limita a tela aos vinte registros mais recentes e
   converte Timestamp em Date antes de chegar aos componentes.
=========================================================== */

export function subscribeToGames(
  onGames: (games: Game[]) => void,
  onError?: (error: Error) => void,
) {
  return onSnapshot(
    query(collection(db, 'games'), orderBy('startsAt', 'desc'), limit(20)),
    (snapshot) =>
      onGames(
        snapshot.docs.map((game) => {
          const data = game.data();
          return {
            id: game.id,
            title: String(data.title ?? 'Jogo'),
            location: String(data.location ?? ''),
            startsAt:
              data.startsAt instanceof Timestamp
                ? data.startsAt.toDate()
                : new Date(data.startsAt),
            notes: String(data.notes ?? ''),
            createdBy: String(data.createdBy ?? ''),
          };
        }),
      ),
    (error) => onError?.(error),
  );
}

/* A rota compartilhável consulta o documento diretamente, inclusive quando
   o jogo é antigo e já não aparece entre os vinte itens da agenda principal. */
export function subscribeToGame(
  gameId: string,
  onGame: (game: Game | null) => void,
  onError?: (error: Error) => void,
) {
  return onSnapshot(
    doc(db, 'games', gameId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onGame(null);
        return;
      }
      const data = snapshot.data();
      onGame({
        id: snapshot.id,
        title: String(data.title ?? 'Jogo'),
        location: String(data.location ?? ''),
        startsAt:
          data.startsAt instanceof Timestamp
            ? data.startsAt.toDate()
            : new Date(data.startsAt),
        notes: String(data.notes ?? ''),
        createdBy: String(data.createdBy ?? ''),
      });
    },
    (error) => onError?.(error),
  );
}

/* Cada jogo possui sua própria subcoleção de respostas. */
export function subscribeToAttendances(
  gameId: string,
  onAttendances: (items: Attendance[]) => void,
) {
  return onSnapshot(
    collection(db, 'games', gameId, 'attendances'),
    (snapshot) => {
      onAttendances(
        snapshot.docs.map((attendance) => attendance.data() as Attendance),
      );
    },
  );
}

/* Somente administração e diretoria passam pelas regras de criação. */
export async function createGame(
  input: Omit<Game, 'id' | 'createdBy'>,
  user: User,
) {
  return addDoc(collection(db, 'games'), {
    ...input,
    startsAt: Timestamp.fromDate(input.startsAt),
    createdBy: user.uid,
    notificationSent: false,
    reminderSent: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/* O document ID é o uid da pessoa representada. Assim existe no
   máximo uma resposta por pessoa em cada jogo. */
export async function setAttendance(
  gameId: string,
  subject: PresenceSubject,
  status: AttendanceStatus,
  respondingUser: User,
) {
  await setDoc(
    doc(db, 'games', gameId, 'attendances', subject.uid),
    {
      userId: subject.uid,
      /* A conta continua sendo a identidade de segurança; quando há vínculo,
       o nome esportivo do atleta é usado na lista pública de presença. */
      displayName: subject.playerName || subject.displayName,
      playerId: subject.playerId,
      playerName: subject.playerName,
      status,
      respondedByUid: respondingUser.uid,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/* ===========================================================
   CADASTRO DE USUÁRIOS E DELEGAÇÕES

   A diretoria pode responder por toda a lista. Membros comuns
   enxergam apenas quem delegou explicitamente para eles.
=========================================================== */

export async function listUsers(): Promise<PresenceSubject[]> {
  const [directory, players] = await Promise.all([
    getDocs(query(collection(db, 'memberDirectory'), orderBy('displayName'))),
    getDocs(collection(db, 'players')),
  ]);
  const playerNames = new Map(
    players.docs.map((player) => [player.id, String(player.data().name ?? '')]),
  );
  return directory.docs.map((user) => {
    const playerId = String(user.data().playerId ?? '');
    return {
      uid: user.id,
      displayName: String(user.data().displayName ?? 'Membro'),
      playerId,
      playerName: playerNames.get(playerId) ?? '',
    };
  });
}

export async function listDelegators(
  userId: string,
): Promise<PresenceSubject[]> {
  const snapshot = await getDocs(
    query(collectionGroup(db, 'delegates'), where('toUserId', '==', userId)),
  );
  return snapshot.docs.map((delegation) => ({
    uid: String(delegation.data().fromUserId),
    displayName: String(delegation.data().fromDisplayName ?? 'Membro'),
    playerId: String(delegation.data().fromPlayerId ?? ''),
    playerName: String(delegation.data().fromPlayerName ?? ''),
  }));
}

export async function listDelegates(
  userId: string,
): Promise<PresenceSubject[]> {
  const snapshot = await getDocs(
    collection(db, 'delegations', userId, 'delegates'),
  );
  return snapshot.docs.map((delegation) => ({
    uid: delegation.id,
    displayName: String(delegation.data().toDisplayName ?? 'Membro'),
    playerId: String(delegation.data().toPlayerId ?? ''),
    playerName: String(delegation.data().toPlayerName ?? ''),
  }));
}

export async function delegatePresence(
  from: PresenceSubject,
  to: PresenceSubject,
) {
  await setDoc(doc(db, 'delegations', from.uid, 'delegates', to.uid), {
    fromUserId: from.uid,
    fromDisplayName: from.displayName,
    fromPlayerId: from.playerId,
    fromPlayerName: from.playerName,
    toUserId: to.uid,
    toDisplayName: to.displayName,
    toPlayerId: to.playerId,
    toPlayerName: to.playerName,
    createdAt: serverTimestamp(),
  });
}

export async function removePresenceDelegate(
  fromUserId: string,
  toUserId: string,
) {
  await deleteDoc(doc(db, 'delegations', fromUserId, 'delegates', toUserId));
}
