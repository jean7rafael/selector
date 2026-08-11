import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

initializeApp();

const database = getFirestore();
const messaging = getMessaging();

/* O backend registra ações que não podem ser auditadas pelo navegador,
   sem incluir senha, token ou qualquer outro valor secreto. */
async function writeServerAudit(request, target, action, changedFields) {
  await database.collection('auditLogs').add({
    action,
    actorEmail: request.auth?.token?.email ?? '',
    actorUid: request.auth.uid,
    changedFields,
    createdAt: FieldValue.serverTimestamp(),
    targetEmail: target.email ?? '',
    targetName: target.displayName ?? target.email ?? 'Usuário',
    targetUid: target.uid,
  });
}

/* ===========================================================
   E-MAIL E SENHA ADMINISTRADOS COM SEGURANÇA

   Somente o backend possui acesso ao SDK administrativo. A senha
   recebida nunca é gravada nem devolvida para o aplicativo.
=========================================================== */

export const adminUpdateUserCredentials = onCall(async (request) => {
  if (!request.auth)
    throw new HttpsError('unauthenticated', 'Entre para continuar.');

  const caller = await database.doc(`users/${request.auth.uid}`).get();
  if (caller.data()?.role !== 'admin') {
    throw new HttpsError(
      'permission-denied',
      'Somente administradores podem editar credenciais.',
    );
  }

  const userId =
    typeof request.data?.userId === 'string' ? request.data.userId.trim() : '';
  const email =
    typeof request.data?.email === 'string'
      ? request.data.email.trim().toLowerCase()
      : '';
  const displayName =
    typeof request.data?.displayName === 'string'
      ? request.data.displayName.trim()
      : '';
  const password =
    typeof request.data?.password === 'string' ? request.data.password : '';
  if (!userId || !email || !displayName || (password && password.length < 6)) {
    throw new HttpsError(
      'invalid-argument',
      'Confira nome, e-mail e nova senha.',
    );
  }

  const previous = await getAuth().getUser(userId);
  const changedFields = [
    previous.email !== email ? 'email' : '',
    previous.displayName !== displayName ? 'displayName' : '',
    password ? 'password' : '',
  ].filter(Boolean);
  const update = { email, displayName };
  if (password) update.password = password;
  await getAuth().updateUser(userId, update);
  if (changedFields.length) {
    await writeServerAudit(
      request,
      {
        uid: userId,
        email,
        displayName,
      },
      'user.credentials',
      changedFields,
    );
  }
  return { updated: true };
});

/* Exclui documentos encontrados por consultas em lotes menores que
   o limite do Firestore, inclusive em cadastros futuros maiores. */
async function deleteQueryDocuments(snapshot) {
  for (let offset = 0; offset < snapshot.docs.length; offset += 400) {
    const batch = database.batch();
    snapshot.docs
      .slice(offset, offset + 400)
      .forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }
}

export const adminDeleteUser = onCall(async (request) => {
  if (!request.auth)
    throw new HttpsError('unauthenticated', 'Entre para continuar.');

  const caller = await database.doc(`users/${request.auth.uid}`).get();
  if (caller.data()?.role !== 'admin') {
    throw new HttpsError(
      'permission-denied',
      'Somente administradores podem excluir usuários.',
    );
  }

  const userId =
    typeof request.data?.userId === 'string' ? request.data.userId.trim() : '';
  if (!userId || userId === request.auth.uid) {
    throw new HttpsError(
      'failed-precondition',
      'A conta administradora atual não pode ser excluída.',
    );
  }

  const targetProfile = await database.doc(`users/${userId}`).get();
  let targetAuth;
  try {
    targetAuth = await getAuth().getUser(userId);
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error;
  }
  const target = {
    uid: userId,
    email: targetAuth?.email ?? targetProfile.data()?.email ?? '',
    displayName:
      targetProfile.data()?.displayName ?? targetAuth?.displayName ?? 'Usuário',
  };
  const playerId =
    typeof targetProfile.data()?.playerId === 'string'
      ? targetProfile.data().playerId
      : '';

  /* A credencial é removida primeiro. Se uma limpeza posterior falhar,
     repetir a operação continua seguro e conclui os documentos restantes. */
  try {
    await getAuth().deleteUser(userId);
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error;
  }

  const [incomingDelegations, attendances] = await Promise.all([
    database.collectionGroup('delegates').where('toUserId', '==', userId).get(),
    database.collectionGroup('attendances').where('userId', '==', userId).get(),
  ]);
  await Promise.all([
    database.recursiveDelete(database.doc(`users/${userId}`)),
    database.recursiveDelete(database.doc(`delegations/${userId}`)),
    database.doc(`userContacts/${userId}`).delete(),
    playerId
      ? database.doc(`playerLinks/${playerId}`).delete()
      : Promise.resolve(),
    deleteQueryDocuments(incomingDelegations),
    deleteQueryDocuments(attendances),
  ]);

  await writeServerAudit(request, target, 'user.delete', ['account']);

  return { deleted: true };
});

/* ===========================================================
   ENVIO EM LOTES PARA TODOS OS APARELHOS INSCRITOS

   O FCM aceita até 500 tokens por requisição. Tokens expirados
   são apagados para que as próximas execuções fiquem menores.
=========================================================== */

async function sendToAllSubscribers(notification, data = {}) {
  const subscriptions = await database
    .collectionGroup('pushSubscriptions')
    .get();
  const items = subscriptions.docs
    .map((document) => ({
      reference: document.ref,
      token: document.data().token,
    }))
    .filter((item) => typeof item.token === 'string' && item.token.length > 0);

  for (let offset = 0; offset < items.length; offset += 500) {
    const batch = items.slice(offset, offset + 500);
    const result = await messaging.sendEachForMulticast({
      tokens: batch.map((item) => item.token),
      notification,
      data,
      webpush: { fcmOptions: { link: '/#/jogos' } },
    });

    const invalidWrites = database.batch();
    let hasInvalidTokens = false;
    result.responses.forEach((response, index) => {
      if (response.success) return;
      const code = response.error?.code;
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        invalidWrites.delete(batch[index].reference);
        hasInvalidTokens = true;
      }
    });
    if (hasInvalidTokens) await invalidWrites.commit();
  }
}

/* ===========================================================
   AVISO IMEDIATO DE NOVO JOGO
=========================================================== */

export const notifyNewGame = onDocumentCreated(
  'games/{gameId}',
  async (event) => {
    const game = event.data?.data();
    if (!game) return;
    const startsAt = game.startsAt?.toDate?.();
    const date = startsAt
      ? new Intl.DateTimeFormat('pt-BR', {
          dateStyle: 'short',
          timeStyle: 'short',
          timeZone: 'America/Sao_Paulo',
        }).format(startsAt)
      : 'em breve';
    await sendToAllSubscribers(
      {
        title: 'Novo jogo no Vôlei Hub',
        body: `${game.title ?? 'Vôlei'} · ${date}`,
      },
      { gameId: event.params.gameId, kind: 'new-game' },
    );
  },
);

/* ===========================================================
   LEMBRETE NAS 24 HORAS ANTERIORES

   reminderSent garante um único envio mesmo que a função rode a
   cada hora. Esta função exige o plano Blaze do Firebase.
=========================================================== */

export const remindUpcomingGames = onSchedule(
  { schedule: 'every 1 hours', timeZone: 'America/Sao_Paulo' },
  async () => {
    const now = Timestamp.now();
    const tomorrow = Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000);
    const games = await database
      .collection('games')
      .where('startsAt', '>=', now)
      .where('startsAt', '<=', tomorrow)
      .where('reminderSent', '==', false)
      .get();

    for (const game of games.docs) {
      await sendToAllSubscribers(
        {
          title: 'Vôlei nas próximas 24 horas',
          body: `Confirme sua presença em ${game.data().title ?? 'Vôlei'}.`,
        },
        { gameId: game.id, kind: 'game-reminder' },
      );
      await game.ref.update({
        reminderSent: true,
        reminderSentAt: FieldValue.serverTimestamp(),
      });
    }
  },
);
