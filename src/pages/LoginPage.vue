<template>
  <!-- O mesmo card alterna entre formulário e sessão já autenticada. -->
  <q-page padding class="row justify-center">
    <div class="full-width" style="max-width: 420px">
      <q-card>
        <q-card-section>
          <div class="text-h5">Acesso da diretoria</div>
          <div class="text-body2 text-grey-7">Entre para administrar atletas, jogos e presenças.</div>
        </q-card-section>

        <q-card-section v-if="currentUser">
          <p>Autenticado como <strong>{{ currentUser.email }}</strong>.</p>
          <q-btn label="Sair" color="primary" :loading="loading" @click="logout" />
        </q-card-section>

        <q-form v-else class="q-gutter-md" @submit.prevent="login">
          <q-card-section class="q-gutter-md">
            <q-input v-model.trim="email" filled type="email" autocomplete="email" label="E-mail" :rules="[(value) => Boolean(value) || 'Informe o e-mail']" />
            <q-input v-model="password" filled type="password" autocomplete="current-password" label="Senha" :rules="[(value) => value.length >= 6 || 'A senha precisa ter pelo menos 6 caracteres']" />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn label="Entrar" type="submit" color="primary" :loading="loading" />
          </q-card-actions>
        </q-form>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseAuth } from 'src/boot/firebase';
import { currentUser } from 'src/misc/auth';

const $q = useQuasar();
const email = ref('');
const password = ref('');
const loading = ref(false);

/* ===========================================================
   ENTRADA E SAÍDA

   O listener global de auth.ts atualiza automaticamente o restante
   da interface depois que o Firebase conclui estas operações.
=========================================================== */

async function login() {
  loading.value = true;
  try {
    const credentials = await signInWithEmailAndPassword(firebaseAuth, email.value, password.value);
    $q.notify({ type: 'positive', message: `Bem-vindo, ${credentials.user.displayName ?? credentials.user.email}.` });
    password.value = '';
  } catch {
    $q.notify({ type: 'negative', message: 'Não foi possível entrar. Confira o e-mail e a senha.' });
  } finally {
    loading.value = false;
  }
}

async function logout() {
  loading.value = true;
  try {
    await signOut(firebaseAuth);
    $q.notify({ type: 'info', message: 'Sessão encerrada.' });
  } catch {
    $q.notify({ type: 'negative', message: 'Não foi possível encerrar a sessão.' });
  } finally {
    loading.value = false;
  }
}
</script>
