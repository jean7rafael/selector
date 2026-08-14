import { route } from 'quasar/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import routes from './routes';
import { hasAuthenticatedUser, hasMinimumRole, type Role } from '../misc/auth';

/* ===========================================================
   CRIAÇÃO DO ROTEADOR

   O histórico respeita o modo definido no Quasar. Hash funciona
   igualmente no Firebase Hosting e na PWA instalada.
=========================================================== */

export default route(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    history: createHistory(
      process.env.MODE === 'ssr' ? void 0 : process.env.VUE_ROUTER_BASE,
    ),
  });

  /* =========================================================
     PROTEÇÃO DAS ROTAS

     Primeiro confirmamos a sessão; depois comparamos o papel
     mínimo. O Firestore repete a autorização no lado do servidor.
  ========================================================= */

  router.beforeEach(async (to) => {
    const hasAuthUser = await hasAuthenticatedUser();
    if (to.meta.requiresAuth && !hasAuthUser) {
      return '/login';
    }
    if (
      to.meta.minimumRole &&
      !(await hasMinimumRole(to.meta.minimumRole as Role))
    ) {
      return '/';
    }
  });

  return router;
});
