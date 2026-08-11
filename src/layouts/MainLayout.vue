<template>
  <!-- Estrutura comum de cabeçalho, menu lateral e página atual. -->
  <q-layout view="hHh lpR fFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat round dense icon="menu" class="q-mr-sm" aria-label="Abrir menu" @click="drawer = !drawer" />
        <q-separator dark vertical inset />
        <q-btn color="white" flat to="/">Vôlei Hub</q-btn>
        <q-space />
        <span v-if="currentUser" class="text-caption q-mr-sm gt-xs">
          {{ currentUser.email }} · {{ roleLabel }}
        </span>
        <q-btn v-if="currentUser" color="white" icon-right="logout" flat to="/login">Sair</q-btn>
        <q-btn v-else color="white" icon-right="login" flat to="/login">Entrar</q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="drawer"
      show-if-above
      :width="220"
      :breakpoint="500"
      bordered
      :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-3'"
    >
      <q-scroll-area class="fit">
        <q-list>
          <template v-for="item in visibleMenu" :key="item.link">
            <q-item v-ripple clickable :to="item.link" exact-active-class="text-primary">
              <q-item-section avatar><q-icon :name="item.icon" /></q-item-section>
              <q-item-section>{{ item.label }}</q-item-section>
            </q-item>
            <q-separator v-if="item.separator" />
          </template>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <q-page-container><router-view /></q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { canManagePlayers, currentRole, currentUser } from 'src/misc/auth';

interface MenuItem {
  icon: string;
  label: string;
  separator: boolean;
  link: string;
  staffOnly?: boolean;
}

/* ===========================================================
   NAVEGAÇÃO PRINCIPAL

   Os itens vivem numa única lista para que desktop e celular
   apresentem os mesmos destinos e divisores.
=========================================================== */

const drawer = ref(false);
const menu: MenuItem[] = [
  { icon: 'home', label: 'Início', separator: true, link: '/' },
  { icon: 'people', label: 'Atletas', separator: false, link: '/atletas' },
  { icon: 'sports_volleyball', label: 'Jogos e presença', separator: true, link: '/jogos' },
  { icon: 'settings', label: 'Ajustes', separator: false, link: '/ajustes' },
];

const visibleMenu = computed(() => menu.filter((item) => !item.staffOnly || canManagePlayers.value));

/* Traduz o papel interno para uma identificação humana no cabeçalho. */
const roleLabel = computed(() => ({ admin: 'Administrador', director: 'Diretoria', member: 'Membro' }[currentRole.value ?? 'member']));
</script>
