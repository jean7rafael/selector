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

    <q-drawer
        v-model="drawer"
        show-if-above
        :width="200"
        :breakpoint="500"
        bordered
        :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-3'"
      >
        <q-scroll-area class="fit">
          <q-list>
            <template v-for="(menuItem, index) in menuList" :key="index">
              <q-item clickable :active="menuItem.label === 'Início'" v-ripple :to="menuItem.link">
                <q-item-section avatar>
                  <q-icon :name="menuItem.icon" />
                </q-item-section>
                <q-item-section>
                  {{ menuItem.label }}
                </q-item-section>
              </q-item>
              <q-separator :key="'sep' + index"  v-if="menuItem.separator" />
            </template>
          </q-list>
        </q-scroll-area>
      </q-drawer>


    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, provide, onBeforeMount } from 'vue';
import { getCurrentUser } from '../boot/firebase.js';

type MenuList = {
  icon: string,
  label: string,
  separator: boolean,
  link: string
}

const currentUser = ref(null);
const menuList: MenuList = [
  {
    icon: 'home',
    label: 'Início',
    separator: true,
    link: '/'
  },
  {
    icon: 'people',
    label: 'Atletas',
    separator: false,
    link: 'atletas'
  },
  {
    icon: 'sports_volleyball',
    label: 'Jogos',
    separator: true,
    link: 'em-construcao'
  },
  {
    icon: 'settings',
    label: 'Ajustes',
    separator: false,
    link: 'ajustes'
  }
];
provide('currentUser', currentUser);

onBeforeMount(async () => {
    try {
      currentUser.value = await getCurrentUser();
      console.log('llemos: user=', JSON.stringify(currentUser.value, null, 2));
    }
    catch (err) {
      currentUser.value = null;
    }
});
const drawer = ref(false);

function toggleLeftDrawer () {
  drawer.value = !drawer.value
}

</script>
