import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { cloudFunctions, db } from 'src/boot/firebase';
import type { Role } from 'src/misc/auth';

export interface ManagedUser {
  uid: string;
  displayName: string;
  email: string;
  phone: string;
  role: Role;
  username: string;
}

export interface ManagedUserDraft {
  displayName: string;
  email: string;
  phone: string;
  username: string;
}

/* ===========================================================
   PAINEL DE USUÁRIOS

   Perfis e telefones permanecem em coleções separadas. Somente
   o administrador passa pelas regras que permitem unir as listas.
=========================================================== */

export async function listManagedUsers(): Promise<ManagedUser[]> {
  const [profiles, contacts] = await Promise.all([
    getDocs(query(collection(db, 'users'), orderBy('displayName'))),
    getDocs(collection(db, 'userContacts')),
  ]);
  const phones = new Map(
    contacts.docs.map((contact) => [
      contact.id,
      String(contact.data().phone ?? ''),
    ]),
  );

  return profiles.docs.map((profile) => {
    const data = profile.data();
    const role =
      data.role === 'admin' || data.role === 'director' ? data.role : 'member';
    return {
      uid: profile.id,
      displayName: String(data.displayName ?? data.email ?? 'Membro'),
      email: String(data.email ?? ''),
      phone: phones.get(profile.id) ?? '',
      role,
      username: String(data.username ?? data.email?.split('@')[0] ?? ''),
    };
  });
}

/* A regra remota repete a autorização e impede alterar a própria função. */
export async function updateManagedUserRole(userId: string, role: Role) {
  await updateDoc(doc(db, 'users', userId), {
    role,
    updatedAt: serverTimestamp(),
  });
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

/* Nome, usuário, e-mail público e telefone são atualizados juntos.
   Se a credencial mudou, o Authentication é validado primeiro. */
export async function updateManagedUserProfile(
  user: ManagedUser,
  draft: ManagedUserDraft,
  newPassword = '',
) {
  await updateAuthenticationCredentials(user, draft, newPassword);

  const batch = writeBatch(db);
  batch.update(doc(db, 'users', user.uid), {
    displayName: draft.displayName,
    email: draft.email,
    username: draft.username,
    updatedAt: serverTimestamp(),
  });
  batch.set(
    doc(db, 'userContacts', user.uid),
    { phone: draft.phone, updatedAt: serverTimestamp() },
    { merge: true },
  );
  await batch.commit();
}

/* A exclusão completa fica no backend para remover também a conta
   do Authentication e subcoleções que o navegador não pode listar. */
export async function deleteManagedUser(userId: string) {
  const callable = httpsCallable(cloudFunctions, 'adminDeleteUser');
  await callable({ userId });
}
