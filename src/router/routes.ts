import { RouteRecordRaw } from 'vue-router';

/* ===========================================================
   MAPA DE PÁGINAS

   Todas compartilham MainLayout. Ajustes exige login, enquanto
   atletas, agenda e presenças permanecem visíveis ao público.
=========================================================== */

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {path: '', component: () => import('pages/IndexPage.vue')},
      {path: 'login', component: () => import('pages/LoginPage.vue')},
      {path: 'atletas', component: () => import('pages/AthletesPage.vue')},
      {path: 'jogos', component: () => import('pages/GamesPage.vue')},
      {path: 'ajustes', component: () => import('pages/SettingsPage.vue'),
        meta: { requiresAuth: true, minimumRole: 'member' }
      },
    ],
  },
  /* Rota final para qualquer endereço inexistente. */
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
