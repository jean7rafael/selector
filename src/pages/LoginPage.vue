<template>
  <!-- O mesmo card reúne entrada, cadastro e a sessão já autenticada. -->
  <q-page class="app-page row justify-center">
    <div class="app-page-content app-page-content--compact">
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
          <q-badge
            :color="emailVerified ? 'positive' : 'warning'"
            :label="emailVerified ? 'E-mail verificado' : 'E-mail pendente'"
          />
          <q-badge
            class="q-ml-sm"
            :color="accountStatusColor"
            :label="accountStatusLabel"
          />
          <p v-if="!emailVerified" class="q-mt-md text-body2 text-grey-7">
            Verifique sua caixa de entrada para confirmar que este endereço é
            seu.
          </p>
          <p
            v-else-if="currentAccountStatus === 'pending'"
            class="q-mt-md text-body2 text-grey-7"
          >
            Seu e-mail foi confirmado. A conta aguarda aprovação da
            administração.
          </p>
          <p
            v-else-if="currentAccountStatus === 'rejected'"
            class="q-mt-md text-body2 text-negative"
          >
            A administração não aprovou esta conta. Procure a diretoria para
            revisar o cadastro.
          </p>
          <div class="app-wrap-actions q-mt-md">
            <q-btn
              v-if="!emailVerified"
              outline
              color="primary"
              label="Enviar verificação"
              :loading="verificationLoading"
              @click="sendVerificationEmail"
            />
            <q-btn
              v-if="!emailVerified"
              flat
              color="primary"
              label="Já verifiquei"
              :loading="verificationLoading"
              @click="refreshVerificationStatus"
            />
            <q-btn
              label="Sair"
              color="primary"
              :loading="loading"
              @click="logout"
            />
          </div>
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
            <q-card-actions align="right" class="app-card-actions-responsive">
              <q-btn
                v-if="mode === 'login'"
                flat
                no-caps
                label="Esqueci minha senha"
                :loading="resetLoading"
                @click="requestPasswordReset"
              />
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
import { computed, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
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
import {
  currentAccountStatus,
  currentUser,
  refreshCurrentAccess,
} from 'src/misc/auth';

const $q = useQuasar();
const mode = ref<'login' | 'register'>('login');
const email = ref('');
const phone = ref('');
const password = ref('');
const passwordConfirmation = ref('');
const showPassword = ref(false);
const loading = ref(false);
const resetLoading = ref(false);
const verificationLoading = ref(false);
const emailVerified = ref(false);
const accountStatusLabel = computed(
  () =>
    ({
      approved: 'Conta aprovada',
      pending: 'Aguardando aprovação',
      rejected: 'Conta não aprovada',
    })[currentAccountStatus.value ?? 'pending'],
);
const accountStatusColor = computed(() =>
  currentAccountStatus.value === 'approved'
    ? 'positive'
    : currentAccountStatus.value === 'rejected'
      ? 'negative'
      : 'warning',
);

/* O SDK atualiza o objeto User fora da reatividade profunda do Vue;
   esta referência simples mantém o selo da tela sincronizado. */
watch(
  currentUser,
  (user) => {
    emailVerified.value = Boolean(user?.emailVerified);
  },
  { immediate: true },
);

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
  emailVerified.value = credentials.user.emailVerified;
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
      status: 'pending',
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

  let verificationSent = true;
  try {
    await sendEmailVerification(credentials.user);
  } catch {
    verificationSent = false;
  }
  emailVerified.value = credentials.user.emailVerified;
  $q.notify({
    type: 'positive',
    message: verificationSent
      ? `Conta criada. Enviamos a verificação para ${normalizedEmail}.`
      : 'Conta criada. Use “Enviar verificação” para confirmar o e-mail.',
  });
}

/* A resposta é deliberadamente genérica para não revelar se um endereço
   específico está ou não cadastrado no Firebase Authentication. */
async function requestPasswordReset() {
  const normalizedEmail = email.value.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    $q.notify({ type: 'negative', message: 'Informe um e-mail válido.' });
    return;
  }

  resetLoading.value = true;
  try {
    await sendPasswordResetEmail(firebaseAuth, normalizedEmail);
    $q.notify({
      type: 'positive',
      message:
        'Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação.',
    });
  } catch (error) {
    if (
      error instanceof FirebaseError &&
      error.code === 'auth/user-not-found'
    ) {
      $q.notify({
        type: 'positive',
        message:
          'Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação.',
      });
    } else {
      $q.notify({
        type: 'negative',
        message: 'Não foi possível solicitar a recuperação agora.',
      });
    }
  } finally {
    resetLoading.value = false;
  }
}

async function sendVerificationEmail() {
  if (!currentUser.value) return;
  verificationLoading.value = true;
  try {
    await sendEmailVerification(currentUser.value);
    $q.notify({
      type: 'positive',
      message: 'Novo e-mail de verificação enviado.',
    });
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Não foi possível enviar a verificação agora.',
    });
  } finally {
    verificationLoading.value = false;
  }
}

async function refreshVerificationStatus() {
  if (!currentUser.value) return;
  verificationLoading.value = true;
  try {
    await reload(currentUser.value);
    await refreshCurrentAccess();
    emailVerified.value = currentUser.value.emailVerified;
    $q.notify({
      type: emailVerified.value ? 'positive' : 'info',
      message: emailVerified.value
        ? 'E-mail confirmado.'
        : 'A confirmação ainda não chegou. Abra o link enviado por e-mail.',
    });
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Não foi possível atualizar a verificação agora.',
    });
  } finally {
    verificationLoading.value = false;
  }
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
