declare const self: ServiceWorkerGlobalScope & typeof globalThis & {
  __WB_MANIFEST: Array<unknown>;
  registration: ServiceWorkerRegistration;
  skipWaiting: () => void;
};

import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

/* ===========================================================
   CACHE E ATUALIZAÇÃO DO APLICATIVO

   O Workbox injeta a lista de arquivos compilados em __WB_MANIFEST
   e oferece a tela principal quando a rede está indisponível.
=========================================================== */

self.skipWaiting();
clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

if (process.env.PROD) {
  registerRoute(new NavigationRoute(
    createHandlerBoundToURL(process.env.PWA_FALLBACK_HTML),
    { denylist: [new RegExp(process.env.PWA_SERVICE_WORKER_REGEX), /workbox-(.)*\.js$/] },
  ));
}

/* ===========================================================
   NOTIFICAÇÕES RECEBIDAS EM SEGUNDO PLANO

   Este trecho só é inicializado quando existe configuração real.
   Mensagens abertas são tratadas pelo boot notifications.ts.
=========================================================== */

if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_APP_ID && process.env.FIREBASE_API_KEY) {
  const messaging = getMessaging(initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
    appId: process.env.FIREBASE_APP_ID,
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  }));

  onBackgroundMessage(messaging, (payload) => {
    const title = payload.notification?.title ?? 'Vôlei Hub';
    void self.registration.showNotification(title, {
      body: payload.notification?.body ?? 'Há uma novidade no próximo jogo.',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/favicon-32x32.png',
      data: payload.data,
    });
  });
}
