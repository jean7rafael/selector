import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {path: '', component: () => import('pages/IndexPage.vue')},
      {path: 'login', component: () => import('pages/LoginPage.vue')},
      {path: 'atletas', component: () => import('pages/AthletesPage.vue')},
      {path: 'ajustes', component: () => import('pages/SettingsPage.vue'),
        meta: { requiresAuth: true }
      },
      {path: 'em-construcao', component: () => import('pages/NotImplementedYet.vue')},
    ],
  },
  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
