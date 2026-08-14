declare const self: ServiceWorkerGlobalScope &
  typeof globalThis & {
    __WB_MANIFEST: Array<unknown>;
    registration: ServiceWorkerRegistration;
    skipWaiting: () => void;
  };

import { clientsClaim } from 'workbox-core';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
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
  registerRoute(
    new NavigationRoute(
      createHandlerBoundToURL(process.env.PWA_FALLBACK_HTML),
      {
        denylist: [
          new RegExp(process.env.PWA_SERVICE_WORKER_REGEX),
          /workbox-(.)*\.js$/,
        ],
      },
    ),
  );
}

/* ===========================================================
   NOTIFICAÇÕES RECEBIDAS EM SEGUNDO PLANO

   Este trecho só é inicializado quando existe configuração real.
   Mensagens abertas são tratadas pelo boot notifications.ts.
=========================================================== */

if (
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_APP_ID &&
  process.env.FIREBASE_API_KEY
) {
  const messaging = getMessaging(
    initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
      appId: process.env.FIREBASE_APP_ID,
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    }),
  );

  onBackgroundMessage(messaging, (payload) => {
    const title =
      payload.notification?.title ?? payload.data?.title ?? 'Vôlei Hub';
    void self.registration.showNotification(title, {
      body:
        payload.notification?.body ??
        payload.data?.body ??
        'Há uma novidade no próximo jogo.',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/favicon-32x32.png',
      data: payload.data,
    });
  });
}

/* Notificações exibidas pelo próprio service worker precisam abrir a rota do
   jogo explicitamente. A URL é validada como caminho interno da PWA. */
type NotificationClickEvent = Event & {
  notification: Notification;
  waitUntil: (promise: Promise<unknown>) => void;
};
type WorkerWindowClient = {
  focus: () => Promise<unknown>;
  navigate: (url: string) => Promise<unknown>;
};
const workerClients = (
  self as unknown as {
    clients: {
      matchAll: (options: {
        includeUncontrolled: boolean;
        type: string;
      }) => Promise<WorkerWindowClient[]>;
      openWindow: (url: string) => Promise<unknown>;
    };
  }
).clients;

self.addEventListener('notificationclick', (rawEvent) => {
  const event = rawEvent as NotificationClickEvent;
  event.notification.close();
  const requestedLink = String(event.notification.data?.link ?? '/#/jogos');
  const link = requestedLink.startsWith('/#/jogos')
    ? requestedLink
    : '/#/jogos';
  const targetUrl = new URL(link, self.location.origin).href;
  event.waitUntil(
    workerClients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (clients) => {
        const existing = clients[0];
        if (existing && 'focus' in existing) {
          await existing.navigate(targetUrl);
          return existing.focus();
        }
        return workerClients.openWindow(targetUrl);
      }),
  );
});
