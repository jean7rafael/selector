import type { User } from 'firebase/auth';
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
} from 'firebase/messaging';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, firebaseApp } from 'src/boot/firebase';

/* O token do FCM não é usado diretamente como document ID. Um hash
   estável evita caracteres problemáticos e ainda permite removê-lo. */
async function tokenDocumentId(token: string) {
  const bytes = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

/* Confere APIs do navegador e o suporte declarado pelo SDK Firebase. */
export async function pushAvailability() {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    !('serviceWorker' in navigator)
  )
    return false;
  return isSupported();
}

/* Persiste somente o token Web Push. O identificador local permite que este
   navegador remova sua própria inscrição sem expor o token na interface. */
async function saveSubscription(user: User, token: string) {
  const id = await tokenDocumentId(token);
  await setDoc(doc(db, 'users', user.uid, 'pushSubscriptions', id), {
    token,
    userId: user.uid,
    platform: 'web',
    userAgent: navigator.userAgent,
    updatedAt: serverTimestamp(),
  });
  localStorage.setItem('selector-push-subscription', id);
}

/* ===========================================================
   ATIVAÇÃO DAS NOTIFICAÇÕES WEB

   Deve partir de um clique do usuário. O navegador registra o
   token na conta atual para que a rotina gratuita do GitHub envie os avisos.
=========================================================== */

export async function enablePushNotifications(user: User) {
  if (!(await pushAvailability()))
    throw new Error('Este navegador não oferece notificações push.');
  if (!user.emailVerified)
    throw new Error('Confirme seu e-mail antes de ativar notificações.');
  if (process.env.MODE !== 'pwa')
    throw new Error('Instale ou abra a versão PWA para ativar notificações.');
  if (!process.env.FIREBASE_VAPID_KEY)
    throw new Error(
      'A chave pública de notificações ainda não foi configurada.',
    );

  const permission = await Notification.requestPermission();
  if (permission !== 'granted')
    throw new Error('A permissão de notificações não foi concedida.');
  const registration = await navigator.serviceWorker.ready;
  const messaging = getMessaging(firebaseApp);
  const token = await getToken(messaging, {
    vapidKey: process.env.FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  if (!token)
    throw new Error(
      'O navegador não gerou um identificador para notificações.',
    );

  await saveSubscription(user, token);
}

/* Remove a inscrição do Firestore e revoga o token neste aparelho. */
export async function disablePushNotifications(user: User) {
  const id = localStorage.getItem('selector-push-subscription');
  if (id) await deleteDoc(doc(db, 'users', user.uid, 'pushSubscriptions', id));
  if (await isSupported()) {
    await deleteToken(getMessaging(firebaseApp));
  }
  localStorage.removeItem('selector-push-subscription');
}
