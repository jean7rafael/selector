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
import { getAuth, signInWithEmailAndPassword, connectAuthEmulator } from 'firebase/auth'

export default {
  setup () {
    const $q = useQuasar()

    const email = ref(null)
    const password = ref(null)

    const auth = getAuth();
    connectAuthEmulator(auth, 'http://127.0.0.1:9099');

    return {
      email,
      password,

      onSubmit () {
          signInWithEmailAndPassword(auth, email, password)
            .then(userCredentials => {
              console.log('User logged in successfully');
              console.log(userCredentials);
            })
            .catch(error => {
              console.error('error during login');
              console.log(error);
            })

          $q.notify({
            color: 'green-4',
            textColor: 'white',
            icon: 'cloud_done',
            message: 'Submitted'
          })
         email.value = null
         password.value = null
        }
    }
  }
}
</script>
