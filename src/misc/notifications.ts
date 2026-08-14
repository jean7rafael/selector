import type { User } from 'firebase/auth';
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
} from 'firebase/messaging';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, firebaseApp } from 'src/boot/firebase';
import {
  isAppleMobilePlatform,
  pushAvailabilityForContext,
  type PushAvailability,
} from 'src/domain/push-support';

/* O token do FCM não é usado diretamente como document ID. Um hash
   estável evita caracteres problemáticos e ainda permite removê-lo. */
async function tokenDocumentId(token: string) {
  const bytes = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

/* Confere primeiro a instalação no iOS/iPadOS, pois esses sistemas escondem
   Notification e Push API enquanto o site está aberto em uma aba comum. */
export async function pushAvailability(): Promise<PushAvailability> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined')
    return 'unsupported';

  const isAppleMobile = isAppleMobilePlatform({
    maxTouchPoints: navigator.maxTouchPoints,
    platform: navigator.platform,
    userAgent: navigator.userAgent,
  });
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  const hasNotificationApi = 'Notification' in window;
  const hasServiceWorker = 'serviceWorker' in navigator;
  let firebaseSupported = false;
  if (hasNotificationApi && hasServiceWorker) {
    try {
      firebaseSupported = await isSupported();
    } catch {
      firebaseSupported = false;
    }
  }

  return pushAvailabilityForContext({
    firebaseSupported,
    hasNotificationApi,
    hasServiceWorker,
    isAppleMobile,
    isStandalone,
    notificationPermission: hasNotificationApi
      ? Notification.permission
      : 'default',
  });
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
  const availability = await pushAvailability();
  if (availability === 'install-required')
    throw new Error(
      'Adicione o Vôlei Hub à Tela de Início e abra pelo novo ícone antes de ativar notificações.',
    );
  if (availability === 'permission-denied')
    throw new Error(
      'As notificações estão bloqueadas nas configurações deste aparelho.',
    );
  if (availability === 'unsupported')
    throw new Error(
      'Este navegador ou aparelho não disponibiliza as APIs de notificações push.',
    );
  if (!user.emailVerified)
    throw new Error('Confirme seu e-mail antes de ativar notificações.');
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
