import { Notify } from 'quasar';
import { getMessaging, isSupported, onMessage } from 'firebase/messaging';
import { firebaseApp } from './firebase';

/* ===========================================================
   NOTIFICAÇÕES RECEBIDAS COM O APLICATIVO ABERTO

   Mensagens em segundo plano pertencem ao service worker. Aqui
   transformamos mensagens em primeiro plano em avisos do Quasar.
=========================================================== */

if (process.env.MODE === 'pwa') {
  void isSupported()
    .then((supported) => {
      if (!supported) return;
      onMessage(getMessaging(firebaseApp), (payload) => {
        Notify.create({
          type: 'info',
          message:
            payload.notification?.title ?? payload.data?.title ?? 'Vôlei Hub',
          caption: payload.notification?.body ?? payload.data?.body,
          icon: 'notifications',
        });
      });
    })
    .catch(() => {
      /* Navegadores sem suporte a push continuam usando todo o restante do
         aplicativo; a ativação manual mostrará a orientação apropriada. */
    });
}
