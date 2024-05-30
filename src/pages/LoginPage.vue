<template>
  <div class="q-pa-md" style="max-width: 400px">

    <q-form
      @submit="onSubmit"
      class="q-gutter-md"
    >
      <q-input
        filled
        type="email"
        v-model="email"
        label="Email"
        lazy-rules
        :rules="[ val => val && val.length > 0 || 'Please type a valid email address']"
      />

      <q-input
        filled
        type="password"
        v-model="password"
        label="Password"
        lazy-rules
        :rules="val2 => val2 && val2.length >= 6 || 'Password needs to be at least 6 characters'"
      />

      <div>
        <q-btn label="Login" type="submit" color="primary"/>
      </div>
    </q-form>

  </div>
</template>

<script>
import { useQuasar } from 'quasar'
import { ref } from 'vue'
import { signInWithEmailAndPassword, connectAuthEmulator, onAuthStateChanged } from 'firebase/auth'
import { firebaseAuth } from '../boot/firebase.js';

export default {
  setup () {
    const $q = useQuasar()

    const email = ref(null)
    const password = ref(null)

    connectAuthEmulator(firebaseAuth, 'http://127.0.0.1:9099');
    const user = firebaseAuth.currentUser;
    console.log('auth=', firebaseAuth);
    console.log('currenUserFromAuth=', firebaseAuth.currentUser);
    console.log('auth.qe=', firebaseAuth.qe);
    console.log('auth.clientVersion=', firebaseAuth.clientVersion);
    console.log('currentUser2=', user);

    return {
      email,
      password,

      onSubmit () {
          signInWithEmailAndPassword(auth, email.value, password.value)
            .then(userCredentials => {
              console.log('User logged in successfully');
              console.log(userCredentials);
              $q.notify({
                type: 'positive',
                message: `Seja bem-vindo ${userCredentials.user.displayName}`
              })
            })
            .catch(error => {
              $q.notify({
                type: 'negative',
                message: 'Não foi possível logar. Tente novamente.'
              })
              console.log(error);
            })

         email.value = null
         password.value = null
        }
    }
  }
}
</script>
