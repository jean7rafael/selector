import { Notify } from 'quasar';
import { getMessaging, isSupported, onMessage } from 'firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { firebaseApp } from './firebase';

/* ===========================================================
   NOTIFICAÇÕES RECEBIDAS COM O APLICATIVO ABERTO

   Mensagens em segundo plano pertencem ao service worker. Aqui
   transformamos mensagens em primeiro plano em avisos do Quasar.
=========================================================== */

if (Capacitor.isNativePlatform()) {
  void import('@capacitor/push-notifications').then(({ PushNotifications }) => {
    void PushNotifications.addListener('pushNotificationReceived', (notification) => {
      Notify.create({ type: 'info', message: notification.title ?? 'Vôlei Hub', caption: notification.body, icon: 'notifications' });
    });
  });
} else void isSupported().then((supported) => {
  if (!supported) return;
  onMessage(getMessaging(firebaseApp), (payload) => {
    Notify.create({
      type: 'info',
      message: payload.notification?.title ?? 'Vôlei Hub',
      caption: payload.notification?.body,
      icon: 'notifications',
    });
  });
});
