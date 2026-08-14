import { computed, readonly, ref, shallowReadonly, shallowRef } from 'vue';
import type { User } from 'firebase/auth';
import { getIdToken, onAuthStateChanged, reload } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db, firebaseAuth } from 'src/boot/firebase';

export type Role = 'admin' | 'director' | 'member';
export type AccountStatus = 'pending' | 'approved' | 'rejected';

export interface CurrentPlayerLink {
  id: string;
  name: string;
}

/* ===========================================================
   ESTADO ÚNICO DA SESSÃO

   Todas as páginas observam as mesmas referências. Isso evita
   criar vários listeners e mantém menu, rotas e botões alinhados.
=========================================================== */

const mutableCurrentUser = shallowRef<User | null>(null);
const mutableCurrentRole = ref<Role | null>(null);
const mutableAccountStatus = ref<AccountStatus | null>(null);
const mutableCurrentPlayer = ref<CurrentPlayerLink | null>(null);
const mutableAuthReady = ref(false);
let resolveFirstAuthState: (() => void) | undefined;
const firstAuthState = new Promise<void>((resolve) => {
  resolveFirstAuthState = resolve;
});

/* O documento administrável é a fonte principal. Custom claims
   antigas continuam aceitas apenas como compatibilidade. */
async function readAccessProfile(user: User) {
  const profile = await getDoc(doc(db, 'users', user.uid));
  const role = profile.data()?.role;
  let normalizedRole: Role;
  if (role === 'admin' || role === 'director' || role === 'member') {
    normalizedRole = role;
  } else {
    const token = await user.getIdTokenResult();
    const claimedRole = token.claims.role;
    normalizedRole =
      claimedRole === 'admin' || claimedRole === 'director'
        ? claimedRole
        : 'member';
  }

  /* Perfis anteriores à aprovação administrativa não possuíam `status`.
     Eles são tratados como aprovados para não bloquear usuários existentes. */
  const storedStatus = profile.data()?.status;
  const status: AccountStatus =
    storedStatus === 'pending' || storedStatus === 'rejected'
      ? storedStatus
      : 'approved';

  const playerId =
    typeof profile.data()?.playerId === 'string'
      ? String(profile.data()?.playerId)
      : '';
  let player: CurrentPlayerLink | null = null;
  if (playerId) {
    const playerDocument = await getDoc(doc(db, 'players', playerId));
    if (playerDocument.exists()) {
      player = {
        id: playerDocument.id,
        name: String(playerDocument.data().name ?? 'Atleta'),
      };
    }
  }

  return { player, role: normalizedRole, status };
}

async function applyAccessProfile(user: User | null) {
  if (!user) {
    mutableCurrentRole.value = null;
    mutableAccountStatus.value = null;
    mutableCurrentPlayer.value = null;
    return;
  }
  const access = await readAccessProfile(user);
  mutableCurrentRole.value = access.role;
  mutableAccountStatus.value = access.status;
  mutableCurrentPlayer.value = access.player;
}

/* ===========================================================
   SINCRONIZAÇÃO COM O FIREBASE AUTH

   Um usuário autenticado sem perfil recebe o menor privilégio.
   Falhas de rede também nunca promovem alguém à diretoria.
=========================================================== */

onAuthStateChanged(firebaseAuth, async (user) => {
  mutableCurrentUser.value = user;
  try {
    await applyAccessProfile(user);
  } catch {
    mutableCurrentRole.value = user ? 'member' : null;
    mutableAccountStatus.value = user ? 'pending' : null;
    mutableCurrentPlayer.value = null;
  } finally {
    mutableAuthReady.value = true;
    resolveFirstAuthState?.();
    resolveFirstAuthState = undefined;
  }
});

/* shallowReadonly protege a referência sem transformar o objeto User
   do SDK num tipo profundamente imutável incompatível com o Firebase. */
export const currentUser = shallowReadonly(mutableCurrentUser);
export const currentRole = readonly(mutableCurrentRole);
export const currentAccountStatus = readonly(mutableAccountStatus);
export const currentPlayer = readonly(mutableCurrentPlayer);
export const authReady = readonly(mutableAuthReady);
export const canManagePlayers = computed(
  () =>
    Boolean(mutableCurrentUser.value?.emailVerified) &&
    mutableAccountStatus.value === 'approved' &&
    (mutableCurrentRole.value === 'admin' ||
      mutableCurrentRole.value === 'director'),
);
export const canUseMemberFeatures = computed(
  () =>
    Boolean(mutableCurrentUser.value?.emailVerified) &&
    mutableAccountStatus.value === 'approved',
);

/* Depois que a pessoa confirma o e-mail ou um administrador aprova a conta,
   esta função renova o token e relê o perfil usado por menus e permissões. */
export async function refreshCurrentAccess() {
  const user = mutableCurrentUser.value;
  if (!user) return;
  await reload(user);
  await getIdToken(user, true);
  await applyAccessProfile(user);
}

/* As proteções do roteador aguardam este ponto para não redirecionar
   uma sessão válida enquanto o Firebase ainda está inicializando. */
export async function waitForAuth() {
  if (!mutableAuthReady.value) await firstAuthState;
  return mutableCurrentUser.value;
}

export async function hasAuthenticatedUser() {
  return Boolean(await waitForAuth());
}

/* Os níveis permitem comparar funções sem espalhar condições pela UI. */
export async function hasMinimumRole(role: Role) {
  await waitForAuth();
  const levels: Record<Role, number> = { member: 1, director: 2, admin: 3 };
  const current = mutableCurrentRole.value;
  return current ? levels[current] >= levels[role] : false;
}
