import { computed, readonly, ref, shallowReadonly, shallowRef } from 'vue';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db, firebaseAuth } from 'src/boot/firebase';

export type Role = 'admin' | 'director' | 'member';

/* ===========================================================
   ESTADO ÚNICO DA SESSÃO

   Todas as páginas observam as mesmas referências. Isso evita
   criar vários listeners e mantém menu, rotas e botões alinhados.
=========================================================== */

const mutableCurrentUser = shallowRef<User | null>(null);
const mutableCurrentRole = ref<Role | null>(null);
const mutableAuthReady = ref(false);
let resolveFirstAuthState: (() => void) | undefined;
const firstAuthState = new Promise<void>((resolve) => {
  resolveFirstAuthState = resolve;
});

/* O documento administrável é a fonte principal. Custom claims
   antigas continuam aceitas apenas como compatibilidade. */
async function readRole(user: User): Promise<Role> {
  const profile = await getDoc(doc(db, 'users', user.uid));
  const role = profile.data()?.role;
  if (role === 'admin' || role === 'director' || role === 'member') return role;

  const token = await user.getIdTokenResult();
  const claimedRole = token.claims.role;
  return claimedRole === 'admin' || claimedRole === 'director'
    ? claimedRole
    : 'member';
}

/* ===========================================================
   SINCRONIZAÇÃO COM O FIREBASE AUTH

   Um usuário autenticado sem perfil recebe o menor privilégio.
   Falhas de rede também nunca promovem alguém à diretoria.
=========================================================== */

onAuthStateChanged(firebaseAuth, async (user) => {
  mutableCurrentUser.value = user;
  try {
    mutableCurrentRole.value = user ? await readRole(user) : null;
  } catch {
    mutableCurrentRole.value = user ? 'member' : null;
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
export const authReady = readonly(mutableAuthReady);
export const canManagePlayers = computed(
  () =>
    mutableCurrentRole.value === 'admin' ||
    mutableCurrentRole.value === 'director',
);

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
