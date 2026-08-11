<template>
  <!-- O mesmo card reúne entrada, cadastro e a sessão já autenticada. -->
  <q-page padding class="row justify-center">
    <div class="full-width" style="max-width: 420px">
      <q-card>
        <q-card-section>
          <div class="text-h5">Acesso do usuário</div>
          <div class="text-body2 text-grey-7">
            Entre ou crie sua conta para participar dos jogos.
          </div>
        </q-card-section>

        <q-card-section v-if="currentUser">
          <p>
            Autenticado como <strong>{{ currentUser.email }}</strong
            >.
          </p>
          <q-btn
            label="Sair"
            color="primary"
            :loading="loading"
            @click="logout"
          />
        </q-card-section>

        <template v-else>
          <!-- As abas deixam explícito se a pessoa vai entrar ou criar uma conta. -->
          <q-tabs v-model="mode" dense align="justify" active-color="primary">
            <q-tab name="login" label="Entrar" />
            <q-tab name="register" label="Criar conta" />
          </q-tabs>

          <q-separator />

          <q-form class="q-gutter-md" @submit.prevent="submit">
            <q-card-section class="q-gutter-md">
              <q-input
                v-model.trim="email"
                filled
                type="email"
                autocomplete="email"
                label="E-mail"
                :rules="emailRules"
              />

              <q-input
                v-if="mode === 'register'"
                v-model="phone"
                filled
                type="tel"
                autocomplete="tel"
                label="Telefone"
                :mask="phoneMask"
                hint="Formato: (XX) XXX XXX XXX"
                :rules="phoneRules"
              />

              <!-- O olho permite conferir a senha; o Firebase exige apenas 6 caracteres. -->
              <q-input
                v-model="password"
                filled
                :type="showPassword ? 'text' : 'password'"
                :autocomplete="
                  mode === 'register' ? 'new-password' : 'current-password'
                "
                label="Senha"
                :hint="
                  mode === 'register'
                    ? 'Use qualquer senha com 6 ou mais caracteres.'
                    : undefined
                "
                :rules="passwordRules"
              >
                <template #append>
                  <q-icon
                    :name="showPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    :aria-label="
                      showPassword ? 'Ocultar senha' : 'Mostrar senha'
                    "
                    @click="showPassword = !showPassword"
                  />
                </template>
              </q-input>

              <q-input
                v-if="mode === 'register'"
                v-model="passwordConfirmation"
                filled
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                label="Repita a senha"
                :rules="passwordConfirmationRules"
              />
            </q-card-section>
            <q-card-actions align="right">
              <q-btn
                :label="mode === 'register' ? 'Criar conta' : 'Entrar'"
                type="submit"
                color="primary"
                :loading="loading"
              />
            </q-card-actions>
          </q-form>
        </template>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { db, firebaseAuth } from 'src/boot/firebase';
import {
  displayNameFromEmail,
  isValidPhone,
  phoneMask,
} from 'src/domain/user-profile';
import { currentUser } from 'src/misc/auth';

const $q = useQuasar();
const mode = ref<'login' | 'register'>('login');
const email = ref('');
const phone = ref('');
const password = ref('');
const passwordConfirmation = ref('');
const showPassword = ref(false);
const loading = ref(false);

/* As regras abaixo são mostradas no próprio campo antes de falar com o servidor. */
const emailRules = [
  (value: string) => Boolean(value) || 'Informe o e-mail',
  (value: string) => /^\S+@\S+\.\S+$/.test(value) || 'Informe um e-mail válido',
];
const phoneRules = [
  (value: string) => Boolean(value) || 'Informe o telefone',
  (value: string) => isValidPhone(value) || 'Use o formato (XX) XXX XXX XXX',
];
const passwordRules = [
  (value: string) =>
    value.length >= 6 || 'A senha precisa ter pelo menos 6 caracteres',
];
const passwordConfirmationRules = [
  (value: string) => Boolean(value) || 'Repita a senha',
  (value: string) => value === password.value || 'As senhas não são iguais',
];

/* Remove credenciais da memória da tela e volta o campo ao modo oculto. */
function clearPasswordFields() {
  password.value = '';
  passwordConfirmation.value = '';
  showPassword.value = false;
}

/* ===========================================================
   ENTRADA E SAÍDA

   O listener global de auth.ts atualiza automaticamente o restante
   da interface depois que o Firebase conclui estas operações.
=========================================================== */

async function submit() {
  loading.value = true;
  try {
    if (mode.value === 'register') {
      await register();
    } else {
      await login();
    }
    clearPasswordFields();
  } catch (error) {
    $q.notify({ type: 'negative', message: authErrorMessage(error) });
  } finally {
    loading.value = false;
  }
}

/* Entrar não grava perfil: apenas recupera a conta que já existe. */
async function login() {
  const credentials = await signInWithEmailAndPassword(
    firebaseAuth,
    email.value.trim().toLowerCase(),
    password.value,
  );
  $q.notify({
    type: 'positive',
    message: `Bem-vindo, ${credentials.user.displayName ?? credentials.user.email}.`,
  });
}

/* ===========================================================
   CADASTRO DE CONTA

   O Authentication guarda a credencial. O Firestore recebe o
   perfil público e, separadamente, o telefone privado da pessoa.
=========================================================== */

async function register() {
  if (
    !isValidPhone(phone.value) ||
    password.value !== passwordConfirmation.value
  ) {
    throw new Error('INVALID_FORM');
  }

  const normalizedEmail = email.value.trim().toLowerCase();
  const displayName = displayNameFromEmail(normalizedEmail);
  const credentials = await createUserWithEmailAndPassword(
    firebaseAuth,
    normalizedEmail,
    password.value,
  );

  try {
    await updateProfile(credentials.user, { displayName });

    /* O lote impede que perfil e telefone fiquem desencontrados. */
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', credentials.user.uid), {
      displayName,
      email: normalizedEmail,
      username: displayName,
      role: 'member',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'userContacts', credentials.user.uid), {
      phone: phone.value,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    /* Uma falha no perfil desfaz a conta recém-criada para permitir nova tentativa. */
    await deleteUser(credentials.user).catch(() => undefined);
    throw error;
  }

  $q.notify({
    type: 'positive',
    message: `Conta criada. Bem-vindo, ${displayName}.`,
  });
}

/* Traduz os erros esperados sem expor detalhes internos do Firebase. */
function authErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === 'auth/email-already-in-use')
      return 'Este e-mail já possui uma conta.';
    if (error.code === 'auth/invalid-credential')
      return 'E-mail ou senha incorretos.';
    if (error.code === 'auth/weak-password')
      return 'A senha precisa ter pelo menos 6 caracteres.';
  }
  if (error instanceof Error && error.message === 'INVALID_FORM') {
    return 'Confira o telefone e a repetição da senha.';
  }
  return mode.value === 'register'
    ? 'Não foi possível criar a conta. Tente novamente.'
    : 'Não foi possível entrar. Confira o e-mail e a senha.';
}

async function logout() {
  loading.value = true;
  try {
    await signOut(firebaseAuth);
    clearPasswordFields();
    $q.notify({ type: 'info', message: 'Sessão encerrada.' });
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Não foi possível encerrar a sessão.',
    });
  } finally {
    loading.value = false;
  }
}
</script>
