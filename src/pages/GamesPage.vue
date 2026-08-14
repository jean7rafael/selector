<template>
  <q-page padding>
    <div class="page-content q-gutter-lg">
      <!-- Cabeçalho e criação reservada à equipe. -->
      <div class="row items-center">
        <div class="col">
          <div class="text-h4">Jogos e presença</div>
          <div class="text-body2 text-grey-7">
            Confirme quem participa dos próximos encontros.
          </div>
        </div>
        <q-btn
          v-if="isGameDetail"
          flat
          icon="arrow_back"
          label="Todos os jogos"
          to="/jogos"
          class="q-mr-sm"
        />
        <q-btn
          v-if="canManagePlayers"
          color="primary"
          icon="event"
          label="Novo jogo"
          @click="gameDialog = true"
        />
      </div>

      <!-- Visitantes acompanham a agenda, mas precisam entrar para responder. -->
      <q-banner v-if="!currentUser" rounded class="bg-blue-1 text-primary">
        Entre na sua conta para responder à chamada. A agenda e a lista de
        presença continuam públicas.
        <template #action><q-btn flat to="/login" label="Entrar" /></template>
      </q-banner>
      <q-banner
        v-else-if="!canUseMemberFeatures"
        rounded
        class="bg-orange-1 text-warning"
      >
        Confirme seu e-mail e aguarde a aprovação da administração para
        responder à chamada.
      </q-banner>

      <!-- Diretoria e delegados escolhem por quem estão respondendo. -->
      <q-select
        v-if="currentUser && subjects.length > 1"
        v-model="selectedSubjectId"
        outlined
        emit-value
        map-options
        label="Responder presença por"
        :options="subjectOptions"
        style="max-width: 420px"
      />

      <q-inner-loading :showing="loading" label="Carregando jogos..." />
      <q-banner v-if="error" rounded class="bg-red-1 text-negative">{{
        error
      }}</q-banner>
      <q-banner
        v-if="!loading && !games.length"
        rounded
        class="bg-grey-2 text-grey-8"
        >Nenhum jogo agendado.</q-banner
      >

      <!-- Cada card combina detalhes, resposta atual e placar público. -->
      <div class="games-grid">
        <q-card v-for="game in games" :key="game.id" flat bordered>
          <q-card-section>
            <div class="text-h6">{{ game.title }}</div>
            <div class="text-subtitle2">
              <q-icon name="schedule" /> {{ formatDate(game.startsAt) }}
            </div>
            <div v-if="game.location" class="text-body2">
              <q-icon name="place" /> {{ game.location }}
            </div>
            <div v-if="game.notes" class="text-body2 q-mt-sm">
              {{ game.notes }}
            </div>
            <q-btn
              v-if="!isGameDetail"
              flat
              dense
              color="primary"
              icon="link"
              label="Abrir lista deste jogo"
              :to="`/jogos/${game.id}`"
              class="q-mt-sm"
            />
          </q-card-section>

          <q-separator />
          <q-card-section>
            <div class="text-subtitle2 q-mb-sm">Sua resposta</div>
            <div class="row q-gutter-sm">
              <q-btn
                unelevated
                color="positive"
                icon="check"
                label="Vou"
                :outline="subjectStatus(game.id) !== 'going'"
                :disable="!canUseMemberFeatures || !selectedSubject"
                @click="respond(game.id, 'going')"
              />
              <q-btn
                unelevated
                color="warning"
                icon="help"
                label="Talvez"
                :outline="subjectStatus(game.id) !== 'maybe'"
                :disable="!canUseMemberFeatures || !selectedSubject"
                @click="respond(game.id, 'maybe')"
              />
              <q-btn
                unelevated
                color="negative"
                icon="close"
                label="Não vou"
                :outline="subjectStatus(game.id) !== 'not_going'"
                :disable="!canUseMemberFeatures || !selectedSubject"
                @click="respond(game.id, 'not_going')"
              />
            </div>
          </q-card-section>

          <q-separator />
          <q-card-section>
            <div class="text-subtitle2">
              Confirmados ({{ grouped(game.id).going.length }})
            </div>
            <div class="q-gutter-xs q-mt-xs">
              <q-chip
                v-for="attendance in grouped(game.id).going"
                :key="attendance.userId"
                color="green-1"
                text-color="positive"
              >
                {{ attendance.displayName }}
              </q-chip>
              <span v-if="!grouped(game.id).going.length" class="text-grey-6"
                >Ninguém confirmou ainda.</span
              >
            </div>
            <div
              v-if="grouped(game.id).maybe.length"
              class="text-caption text-grey-7 q-mt-sm"
            >
              Talvez:
              {{
                grouped(game.id)
                  .maybe.map((item) => item.displayName)
                  .join(', ')
              }}
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Formulário de um novo encontro. -->
    <q-dialog v-model="gameDialog">
      <q-card style="width: 460px; max-width: 95vw">
        <q-card-section><div class="text-h6">Agendar jogo</div></q-card-section>
        <q-form @submit.prevent="saveGame">
          <q-card-section class="q-gutter-md">
            <q-input
              v-model.trim="gameDraft.title"
              label="Título"
              :rules="[(value) => Boolean(value) || 'Informe o título']"
            />
            <q-input
              v-model="gameDraft.startsAt"
              type="datetime-local"
              label="Data e hora"
              stack-label
            />
            <q-input v-model.trim="gameDraft.location" label="Local" />
            <q-input
              v-model.trim="gameDraft.notes"
              type="textarea"
              label="Observações"
            />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Cancelar" v-close-popup />
            <q-btn
              color="primary"
              label="Agendar"
              type="submit"
              :loading="saving"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue';
import { useQuasar } from 'quasar';
import { useRoute } from 'vue-router';
import {
  canManagePlayers,
  canUseMemberFeatures,
  currentPlayer,
  currentRole,
  currentUser,
} from 'src/misc/auth';
import {
  createGame,
  listDelegators,
  listUsers,
  setAttendance,
  subscribeToGame,
  subscribeToAttendances,
  subscribeToGames,
  type Attendance,
  type AttendanceStatus,
  type Game,
  type PresenceSubject,
} from 'src/misc/games';

const $q = useQuasar();
const route = useRoute();
const gameId = computed(() => String(route.params.gameId ?? ''));
const isGameDetail = computed(() => Boolean(gameId.value));
const games = ref<Game[]>([]);
const attendances = reactive<Record<string, Attendance[]>>({});
const subjects = ref<PresenceSubject[]>([]);
const selectedSubjectId = ref('');
const loading = ref(true);
const error = ref('');
const gameDialog = ref(false);
const saving = ref(false);
const attendanceSubscriptions = new Map<string, () => void>();
let unsubscribeGames: (() => void) | undefined;

const now = new Date(Date.now() + 24 * 60 * 60 * 1000);
now.setMinutes(0, 0, 0);
const gameDraft = reactive({
  title: 'Vôlei',
  location: '',
  notes: '',
  startsAt: now.toISOString().slice(0, 16),
});

/* ===========================================================
   PESSOA REPRESENTADA NA RESPOSTA
=========================================================== */

const selectedSubject = computed(() =>
  subjects.value.find((subject) => subject.uid === selectedSubjectId.value),
);
const subjectOptions = computed(() =>
  subjects.value.map((subject) => ({
    label: subject.playerName
      ? `${subject.playerName} (${subject.displayName})`
      : subject.displayName,
    value: subject.uid,
  })),
);

/* ===========================================================
   LISTENERS EM TEMPO REAL

   Cada jogo recebe um listener de presenças. Ao sair da tela ou
   remover um jogo, todos eles são cancelados explicitamente.
=========================================================== */

onMounted(() => {
  if (gameId.value) {
    unsubscribeGames = subscribeToGame(
      gameId.value,
      (game) => {
        games.value = game ? [game] : [];
        loading.value = false;
        if (game && !attendanceSubscriptions.has(game.id)) {
          attendanceSubscriptions.set(
            game.id,
            subscribeToAttendances(game.id, (items) => {
              attendances[game.id] = items;
            }),
          );
        }
      },
      () => {
        loading.value = false;
        error.value = 'Não foi possível carregar este jogo.';
      },
    );
    return;
  }
  unsubscribeGames = subscribeToGames(
    (freshGames) => {
      games.value = freshGames;
      loading.value = false;
      const gameIds = new Set(freshGames.map((game) => game.id));
      attendanceSubscriptions.forEach((unsubscribe, gameId) => {
        if (!gameIds.has(gameId)) {
          unsubscribe();
          attendanceSubscriptions.delete(gameId);
          delete attendances[gameId];
        }
      });
      freshGames.forEach((game) => {
        if (!attendanceSubscriptions.has(game.id)) {
          attendanceSubscriptions.set(
            game.id,
            subscribeToAttendances(game.id, (items) => {
              attendances[game.id] = items;
            }),
          );
        }
      });
    },
    () => {
      loading.value = false;
      error.value = 'Não foi possível carregar os jogos.';
    },
  );
});

onBeforeUnmount(() => {
  unsubscribeGames?.();
  attendanceSubscriptions.forEach((unsubscribe) => unsubscribe());
});

watch(
  [currentUser, currentRole, currentPlayer, canUseMemberFeatures],
  async ([user]) => {
    if (!user) {
      subjects.value = [];
      selectedSubjectId.value = '';
      return;
    }
    const self = {
      uid: user.uid,
      displayName: user.displayName ?? 'Você',
      playerId: currentPlayer.value?.id ?? '',
      playerName: currentPlayer.value?.name ?? '',
    };
    try {
      const others = canUseMemberFeatures.value
        ? canManagePlayers.value
          ? await listUsers()
          : await listDelegators(user.uid)
        : [];
      subjects.value = [
        self,
        ...others.filter((subject) => subject.uid !== user.uid),
      ];
    } catch {
      subjects.value = [self];
    }
    if (
      !subjects.value.some((subject) => subject.uid === selectedSubjectId.value)
    )
      selectedSubjectId.value = user.uid;
  },
  { immediate: true },
);

/* ===========================================================
   APRESENTAÇÃO E AÇÕES
=========================================================== */

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(date);
}

function grouped(gameId: string) {
  const values = attendances[gameId] ?? [];
  return {
    going: values.filter((item) => item.status === 'going'),
    maybe: values.filter((item) => item.status === 'maybe'),
    notGoing: values.filter((item) => item.status === 'not_going'),
  };
}

function subjectStatus(gameId: string) {
  return (attendances[gameId] ?? []).find(
    (item) => item.userId === selectedSubjectId.value,
  )?.status;
}

async function respond(gameId: string, status: AttendanceStatus) {
  if (
    !currentUser.value ||
    !canUseMemberFeatures.value ||
    !selectedSubject.value
  )
    return;
  try {
    await setAttendance(
      gameId,
      selectedSubject.value,
      status,
      currentUser.value,
    );
    $q.notify({ type: 'positive', message: 'Presença atualizada.' });
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Você não tem permissão para responder por essa pessoa.',
    });
  }
}

async function saveGame() {
  if (!currentUser.value) return;
  saving.value = true;
  try {
    await createGame(
      {
        title: gameDraft.title,
        location: gameDraft.location,
        notes: gameDraft.notes,
        startsAt: new Date(gameDraft.startsAt),
      },
      currentUser.value,
    );
    gameDialog.value = false;
    $q.notify({ type: 'positive', message: 'Jogo agendado.' });
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Não foi possível agendar o jogo.',
    });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.page-content {
  max-width: 1000px;
  margin: 0 auto;
}
.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 18px;
}
</style>
