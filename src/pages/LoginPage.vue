<template>
    <div class="q-pa-md" style="max-width: 400px">

      <p v-if="currentUser">Já autenticado como " {{ currentUser.displayName }} "</p>
      <div v-else> 
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
    </div>
</template>

<script>
import { useQuasar } from 'quasar'
import { ref } from 'vue'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { firebaseAuth, getCurrentUser } from '../boot/firebase.js';

export default {
  setup () {
    const $q = useQuasar();
    const email = ref(null);
    const password = ref(null);

    return {
      email,
      password,
      onSubmit () {
          signInWithEmailAndPassword(firebaseAuth, email.value, password.value)
            .then(userCredentials => {
              console.log('User logged in successfully');
              console.log(userCredentials);
              $q.notify({
                type: 'positive',
                message: `Seja bem-vindo ${userCredentials.user.displayName}`
              })
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
    }
  },
  data() {
    return {
      currentUser: null,
    }
  },
  async beforeRouteEnter(to, from, next) {
    try {
      console.log('beforeRouteEnter: about to call getCurrentUser()');
      const possibleUser = await getCurrentUser();
      console.log('beforeRouteEnter: just called getCurrentUser()');
      console.log('possibleUser=', possibleUser);
      next(vm => vm.setUser(possibleUser))
    } catch (err) {
      console.log('beforeRouteEnter: error when calling getCurrentUser()');
      console.log('error=', err);
      // `setError` is a method defined below
      next(vm => vm.setUser(null))
    }
  },
  // when route changes and this component is already rendered,
  // the logic will be slightly different.
  beforeRouteUpdate(to, from) {
    this.currentUser = null
    getCurrentUser().then(this.setUser).catch(this.setUser)
  },
  methods: {
    setUser(user) {
      this.currentUser = user
      console.log('userOnRouterStuff=', user);
    }
  }
}
</script>
