import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) throw new Error('FIREBASE_PROJECT_ID não foi informado.');

/* O GitHub fornece uma credencial temporária do serviço durante a execução.
   Nenhuma chave privada é salva no repositório ou enviada ao navegador. */
const app = initializeApp({ credential: applicationDefault(), projectId });
const auth = getAuth(app);
const database = getFirestore(app);
const messaging = getMessaging(app);

async function activeSubscriptions() {
  const snapshot = await database.collectionGroup('pushSubscriptions').get();
  const raw = snapshot.docs
    .map((document) => {
      const data = document.data();
      return {
        platform: data.platform,
        reference: document.ref,
        token: data.token,
        userId: data.userId,
      };
    })
    .filter(
      (item) =>
        item.platform === 'web' &&
        typeof item.token === 'string' &&
        item.token.length > 0 &&
        typeof item.userId === 'string',
    );
  const userIds = [...new Set(raw.map((item) => item.userId))];
  const allowed = new Set();

  /* getUsers aceita no máximo cem identificadores. O perfil controla a
     aprovação e o Authentication confirma que o endereço foi verificado. */
  for (let offset = 0; offset < userIds.length; offset += 100) {
    const chunk = userIds.slice(offset, offset + 100);
    const [profiles, authUsers] = await Promise.all([
      database.getAll(
        ...chunk.map((userId) => database.doc(`users/${userId}`)),
      ),
      auth.getUsers(chunk.map((uid) => ({ uid }))),
    ]);
    const verified = new Set(
      authUsers.users
        .filter((user) => user.emailVerified)
        .map((user) => user.uid),
    );
    profiles.forEach((profile) => {
      const status = profile.data()?.status;
      if (
        profile.exists &&
        status !== 'pending' &&
        status !== 'rejected' &&
        verified.has(profile.id)
      ) {
        allowed.add(profile.id);
      }
    });
  }
  return raw.filter((item) => allowed.has(item.userId));
}

async function sendNotification(subscriptions, notification, gameId, kind) {
  const link = `/#/jogos/${encodeURIComponent(gameId)}`;
  for (let offset = 0; offset < subscriptions.length; offset += 500) {
    const batch = subscriptions.slice(offset, offset + 500);
    const result = await messaging.sendEachForMulticast({
      tokens: batch.map((item) => item.token),
      /* A mensagem contém somente dados. Assim o service worker exibe um
         único aviso e preserva a rota interna que será aberta pelo clique. */
      data: {
        body: notification.body ?? '',
        gameId,
        kind,
        link,
        title: notification.title,
      },
      webpush: { headers: { TTL: '86400', Urgency: 'high' } },
    });

    /* Tokens revogados são removidos para não consumir tentativas nas
       execuções seguintes. Outros erros permanecem para nova tentativa. */
    const invalidWrites = database.batch();
    let hasInvalidTokens = false;
    result.responses.forEach((response, index) => {
      const code = response.error?.code;
      if (
        !response.success &&
        (code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token')
      ) {
        invalidWrites.delete(batch[index].reference);
        hasInvalidTokens = true;
      }
    });
    if (hasInvalidTokens) await invalidWrites.commit();
  }
}

const subscriptions = await activeSubscriptions();

/* A rotina agendada substitui Cloud Functions no plano Spark. Novos jogos
   podem levar até o próximo ciclo do GitHub para gerar o aviso. */
const newGames = await database
  .collection('games')
  .where('notificationSent', '==', false)
  .limit(20)
  .get();
for (const game of newGames.docs) {
  const startsAt = game.data().startsAt?.toDate?.();
  const date = startsAt
    ? new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'America/Sao_Paulo',
      }).format(startsAt)
    : 'em breve';
  await sendNotification(
    subscriptions,
    {
      title: 'Novo jogo no Vôlei Hub',
      body: `${game.data().title ?? 'Vôlei'} · ${date}`,
    },
    game.id,
    'new-game',
  );
  await game.ref.update({
    notificationSent: true,
    notificationSentAt: FieldValue.serverTimestamp(),
  });
}

const now = Timestamp.now();
const tomorrow = Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000);
const upcomingGames = await database
  .collection('games')
  .where('reminderSent', '==', false)
  .where('startsAt', '>=', now)
  .where('startsAt', '<=', tomorrow)
  .get();
for (const game of upcomingGames.docs) {
  await sendNotification(
    subscriptions,
    {
      title: 'Vôlei nas próximas 24 horas',
      body: `Confirme sua presença em ${game.data().title ?? 'Vôlei'}.`,
    },
    game.id,
    'game-reminder',
  );
  await game.ref.update({
    reminderSent: true,
    reminderSentAt: FieldValue.serverTimestamp(),
  });
}

console.log(
  `Notificações processadas: ${newGames.size} jogos novos, ${upcomingGames.size} lembretes, ${subscriptions.length} inscrições ativas.`,
);
