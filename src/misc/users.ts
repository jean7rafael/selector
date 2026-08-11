import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { cloudFunctions, db, firebaseAuth } from 'src/boot/firebase';
import type { Role } from 'src/misc/auth';

export interface ManagedUser {
  uid: string;
  displayName: string;
  email: string;
  phone: string;
  playerId: string;
  playerName: string;
  role: Role;
  username: string;
}

export interface ManagedUserDraft {
  displayName: string;
  email: string;
  phone: string;
  playerId: string;
  username: string;
}

export type AuditAction =
  | 'user.credentials'
  | 'user.delete'
  | 'user.playerLink'
  | 'user.profile'
  | 'user.role';

export interface AuditLog {
  id: string;
  action: AuditAction;
  actorEmail: string;
  actorUid: string;
  changedFields: string[];
  createdAt: Date | null;
  targetEmail: string;
  targetName: string;
  targetUid: string;
}

/* ===========================================================
   PAINEL DE USUÁRIOS

   Perfis e telefones permanecem em coleções separadas. Somente
   o administrador passa pelas regras que permitem unir as listas.
=========================================================== */

export async function listManagedUsers(): Promise<ManagedUser[]> {
  const [profiles, contacts, players] = await Promise.all([
    getDocs(query(collection(db, 'users'), orderBy('displayName'))),
    getDocs(collection(db, 'userContacts')),
    getDocs(collection(db, 'players')),
  ]);
  const phones = new Map(
    contacts.docs.map((contact) => [
      contact.id,
      String(contact.data().phone ?? ''),
    ]),
  );
  const playerNames = new Map(
    players.docs.map((player) => [
      player.id,
      String(player.data().name ?? 'Atleta sem nome'),
    ]),
  );

  return profiles.docs.map((profile) => {
    const data = profile.data();
    const role =
      data.role === 'admin' || data.role === 'director' ? data.role : 'member';
    const playerId = typeof data.playerId === 'string' ? data.playerId : '';
    return {
      uid: profile.id,
      displayName: String(data.displayName ?? data.email ?? 'Membro'),
      email: String(data.email ?? ''),
      phone: phones.get(profile.id) ?? '',
      playerId,
      playerName: playerNames.get(playerId) ?? '',
      role,
      username: String(data.username ?? data.email?.split('@')[0] ?? ''),
    };
  });
}

/* ===========================================================
   HISTÓRICO ADMINISTRATIVO

   A lista nunca contém senhas ou valores anteriores. Ela registra
   apenas quem agiu, a conta afetada e quais campos foram alterados.
=========================================================== */

export async function listAuditLogs(): Promise<AuditLog[]> {
  const snapshot = await getDocs(
    query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(50)),
  );
  return snapshot.docs.map((entry) => {
    const data = entry.data();
    const timestamp = data.createdAt as { toDate?: () => Date } | undefined;
    return {
      id: entry.id,
      action: data.action as AuditAction,
      actorEmail: String(data.actorEmail ?? ''),
      actorUid: String(data.actorUid ?? ''),
      changedFields: Array.isArray(data.changedFields)
        ? data.changedFields.map(String)
        : [],
      createdAt: timestamp?.toDate?.() ?? null,
      targetEmail: String(data.targetEmail ?? ''),
      targetName: String(data.targetName ?? ''),
      targetUid: String(data.targetUid ?? ''),
    };
  });
}

/* Adiciona uma trilha no mesmo lote da alteração para que os dois
   documentos sejam confirmados ou rejeitados juntos pelo Firestore. */
function addAuditToBatch(
  batch: ReturnType<typeof writeBatch>,
  user: ManagedUser,
  action: AuditAction,
  changedFields: string[],
) {
  const actor = firebaseAuth.currentUser;
  if (!actor) throw new Error('Usuário não autenticado.');
  batch.set(doc(collection(db, 'auditLogs')), {
    action,
    actorEmail: actor.email ?? '',
    actorUid: actor.uid,
    changedFields,
    createdAt: serverTimestamp(),
    targetEmail: user.email,
    targetName: user.displayName,
    targetUid: user.uid,
  });
}

/* A regra remota repete a autorização e impede alterar a própria função. */
export async function updateManagedUserRole(user: ManagedUser, role: Role) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', user.uid), {
    role,
    updatedAt: serverTimestamp(),
  });
  addAuditToBatch(batch, user, 'user.role', ['role']);
  await batch.commit();
}

/* E-mail e senha pertencem ao Authentication e exigem uma função
   privilegiada; nenhum segredo administrativo fica no navegador. */
async function updateAuthenticationCredentials(
  user: ManagedUser,
  draft: ManagedUserDraft,
  newPassword: string,
) {
  if (draft.email === user.email && !newPassword) return;
  const callable = httpsCallable(cloudFunctions, 'adminUpdateUserCredentials');
  await callable({
    userId: user.uid,
    displayName: draft.displayName,
    email: draft.email,
    password: newPassword || undefined,
  });
}

/* Verifica o documento canônico antes de reservar um atleta. O ID do
   atleta como ID do vínculo impede duas contas de ocuparem a mesma vaga. */
async function assertPlayerIsAvailable(user: ManagedUser, playerId: string) {
  if (!playerId || playerId === user.playerId) return;
  const existing = await getDoc(doc(db, 'playerLinks', playerId));
  if (existing.exists() && existing.data().userId !== user.uid) {
    throw new Error('PLAYER_ALREADY_LINKED');
  }
}

/* Nome, usuário, e-mail público, telefone e atleta são atualizados juntos.
   Se a credencial mudou, o Authentication é validado antes do lote. */
export async function updateManagedUserProfile(
  user: ManagedUser,
  draft: ManagedUserDraft,
  newPassword = '',
) {
  await assertPlayerIsAvailable(user, draft.playerId);
  await updateAuthenticationCredentials(user, draft, newPassword);

  const changedFields = [
    user.displayName !== draft.displayName ? 'displayName' : '',
    user.email !== draft.email ? 'email' : '',
    user.username !== draft.username ? 'username' : '',
    user.phone !== draft.phone ? 'phone' : '',
    user.playerId !== draft.playerId ? 'playerId' : '',
  ].filter(Boolean);
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', user.uid), {
    displayName: draft.displayName,
    email: draft.email,
    playerId: draft.playerId || null,
    username: draft.username,
    updatedAt: serverTimestamp(),
  });
  batch.set(
    doc(db, 'userContacts', user.uid),
    { phone: draft.phone, updatedAt: serverTimestamp() },
    { merge: true },
  );

  if (user.playerId && user.playerId !== draft.playerId) {
    batch.delete(doc(db, 'playerLinks', user.playerId));
  }
  if (draft.playerId && user.playerId !== draft.playerId) {
    batch.set(doc(db, 'playerLinks', draft.playerId), {
      createdAt: serverTimestamp(),
      playerId: draft.playerId,
      updatedAt: serverTimestamp(),
      userId: user.uid,
    });
  }
  if (changedFields.length) {
    addAuditToBatch(
      batch,
      user,
      user.playerId !== draft.playerId ? 'user.playerLink' : 'user.profile',
      changedFields,
    );
  }
  await batch.commit();
}

/* A exclusão completa fica no backend para remover também a conta
   do Authentication e subcoleções que o navegador não pode listar. */
export async function deleteManagedUser(userId: string) {
  const callable = httpsCallable(cloudFunctions, 'adminDeleteUser');
  await callable({ userId });
}
