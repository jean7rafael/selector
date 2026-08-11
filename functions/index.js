import { initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';

initializeApp();

const database = getFirestore();
const messaging = getMessaging();

/* ===========================================================
   ENVIO EM LOTES PARA TODOS OS APARELHOS INSCRITOS

   O FCM aceita até 500 tokens por requisição. Tokens expirados
   são apagados para que as próximas execuções fiquem menores.
=========================================================== */

async function sendToAllSubscribers(notification, data = {}) {
  const subscriptions = await database.collectionGroup('pushSubscriptions').get();
  const items = subscriptions.docs
    .map((document) => ({ reference: document.ref, token: document.data().token }))
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
      if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
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

export const notifyNewGame = onDocumentCreated('games/{gameId}', async (event) => {
  const game = event.data?.data();
  if (!game) return;
  const startsAt = game.startsAt?.toDate?.();
  const date = startsAt
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(startsAt)
    : 'em breve';
  await sendToAllSubscribers(
    { title: 'Novo jogo no Vôlei Hub', body: `${game.title ?? 'Vôlei'} · ${date}` },
    { gameId: event.params.gameId, kind: 'new-game' },
  );
});

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
    const games = await database.collection('games')
      .where('startsAt', '>=', now)
      .where('startsAt', '<=', tomorrow)
      .where('reminderSent', '==', false)
      .get();

    for (const game of games.docs) {
      await sendToAllSubscribers(
        { title: 'Vôlei nas próximas 24 horas', body: `Confirme sua presença em ${game.data().title ?? 'Vôlei'}.` },
        { gameId: game.id, kind: 'game-reminder' },
      );
      await game.ref.update({ reminderSent: true, reminderSentAt: FieldValue.serverTimestamp() });
    }
  },
);
