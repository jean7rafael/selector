<template>
    <div class="q-pa-md" style="max-width: 400px">
      <div v-if="currentUser"> 
        <p>Autenticado como "{{ currentUser.email }}"</p> 
          <q-btn label="Sair" color="primary" @click="onLogout"/>
      </div>
      <div v-else> 
        <q-form
          @submit="onLogin"
          class="q-gutter-md"
        >
          <q-input
            filled
            type="email"
            autocomplete="email"
            v-model="email"
            label="Email"
            lazy-rules
            :rules="[ val => val && val.length > 0 || 'Please type a valid email address']"
          />

          <q-input
            filled
            type="password"
            autocomplete="current-password"
            v-model="password"
            label="Password"
            lazy-rules
            :rules="[val2 => val2 && val2.length >= 6 || 'Password needs to be at least 6 characters']"
          />

          <div>
            <q-btn label="Login" type="submit" color="primary"/>
          </div>
        </q-form>
      </div>
    </div>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { ref, inject } from 'vue'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { firebaseAuth } from '../boot/firebase.js';

const currentUser = inject('currentUser');
const $q = useQuasar();
const email = ref(null);
const password = ref(null);

function onLogin () {
  signInWithEmailAndPassword(firebaseAuth, email.value, password.value)
    .then(userCredentials => {
      const user = userCredentials.user.displayName ?? userCredentials.user.email;
      $q.notify({
        type: 'positive',
        message: `Seja bem-vindo ${user}`
      })
      currentUser.value = userCredentials.user;
    })
    .catch(() => {
      $q.notify({
        type: 'negative',
        message: 'Não foi possível logar. Tente novamente.'
      })
    })
    email.value = null
    password.value = null
}

async function onLogout () {
  try {
    const user = currentUser.value.displayName ?? currentUser.value.email;
    await signOut(firebaseAuth);
    currentUser.value = null;
    $q.notify({
      type: 'info',
      message:`${user} deslogado com sucesso`
    });
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: 'Não foi possível deslogar'
    });
    console.error(err);
  }
}

</script>
