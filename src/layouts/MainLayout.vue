<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated>
      <q-toolbar>

        <q-btn flat round dense icon="menu" class="q-mr-sm" @click="toggleLeftDrawer" />
        <q-separator dark vertical inset />
        <q-btn color="white" flat to="/">Volei Hub</q-btn>
        <q-space />
        <q-btn v-if="currentUser" color="white" icon-right="logout" flat to="login">Sair</q-btn>
        <q-btn v-else color="white" icon-right="login" flat to="login">Entrar</q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer show-if-above v-model="leftDrawerOpen" side="left" behavior="normal" bordered>
      <!-- drawer content -->
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { getCurrentUser } from '../boot/firebase.js';
import { useRoute } from 'vue-router';

const currentUser = ref(null);
const leftDrawerOpen = ref(false);
const route = useRoute();

watch(() => route.params.id, fetchData, {immediate: true});

function toggleLeftDrawer () {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

async function fetchData() {
  try {
    currentUser.value = await getCurrentUser();
  } catch (err) {
    currentUser.value = null;
  }
}

</script>
