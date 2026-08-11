<template>
  <q-page padding>
    <div class="page-content q-gutter-lg">
      <!-- Título e cópia de segurança do cadastro atual. -->
      <div class="row items-center q-col-gutter-md">
        <div class="col">
          <div class="text-h4">Atletas</div>
          <div class="text-body2 text-grey-7">
            Selecione quem vai jogar e monte times equilibrados.
          </div>
        </div>
        <div class="col-auto row q-gutter-sm">
          <q-btn
            outline
            icon="download"
            label="Exportar"
            :disable="players.length === 0"
            @click="exportPlayers"
          />
          <q-btn
            v-if="canManagePlayers"
            color="primary"
            icon="person_add"
            label="Adicionar"
            @click="openNewPlayer"
          />
        </div>
      </div>

      <q-banner v-if="loadError" rounded class="bg-red-1 text-negative">
        {{ loadError }}
      </q-banner>

      <!-- Cadastro sincronizado em tempo real com o Firestore. -->
      <q-table
        flat
        bordered
        title="Jogadores de vôlei"
        :rows="players"
        :columns="visibleColumns"
        row-key="id"
        :loading="loading"
        :rows-per-page-options="[0]"
        :pagination="{ rowsPerPage: 0 }"
      >
        <template #top-right>
          <q-checkbox
            v-model="selectAll"
            label="Selecionar todos"
            color="green"
            @update:model-value="toggleAll"
          />
          <q-btn
            v-if="canManagePlayers && selectedPlayers.length"
            flat
            icon="delete"
            color="negative"
            label="Excluir selecionados"
            @click="deleteSelected"
          />
        </template>

        <template #body-cell-selected="props">
          <q-td :props="props"
            ><q-checkbox v-model="props.row.selected" color="green"
          /></q-td>
        </template>
        <template #body-cell-relevanciaCalc="props">
          <q-td :props="props">{{ Math.round(props.row.relevanciaCalc) }}</q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props">
            <q-btn
              round
              flat
              dense
              icon="edit"
              aria-label="Editar atleta"
              @click="openEditPlayer(props.row)"
            />
            <q-btn
              round
              flat
              dense
              icon="delete"
              color="negative"
              aria-label="Excluir atleta"
              @click="deleteOne(props.row)"
            />
          </q-td>
        </template>
        <template #no-data>
          <div class="full-width text-center q-pa-lg text-grey-7">
            Nenhum atleta cadastrado.
          </div>
        </template>
      </q-table>

      <!-- Controles que transformam a seleção da tabela em times. -->
      <q-card flat bordered>
        <q-card-section class="row items-center q-col-gutter-md">
          <div class="col-12 col-sm">
            <div class="text-h6">Formação dos times</div>
            <div class="text-body2">{{ teamInfo.message }}</div>
          </div>
          <div class="col-auto">
            <q-toggle
              v-model="balanceWomen"
              label="Equilibrar mulheres"
              color="orange"
            />
          </div>
          <div class="col-auto">
            <q-btn
              color="green"
              icon="groups"
              label="Selecionar times"
              :disable="teamInfo.teams === 0"
              @click="formTeams"
            />
          </div>
        </q-card-section>
      </q-card>

      <!-- Resultado independente do cadastro: formar times não grava dados. -->
      <div v-if="teams.length" class="teams-container">
        <q-card
          v-for="(team, index) in teams"
          :key="index"
          flat
          bordered
          class="team-card"
        >
          <q-card-section class="bg-primary text-white">
            <div class="text-h6">Time {{ index + 1 }}</div>
            <div class="text-caption">
              Relevância total: {{ Math.round(team.totalRelevance) }}
            </div>
          </q-card-section>
          <q-list separator>
            <q-item v-for="player in team.players" :key="player.id">
              <q-item-section>
                <q-item-label>{{ player.name }}</q-item-label>
                <q-item-label caption>{{ player.position }}</q-item-label>
              </q-item-section>
              <q-item-section side>{{
                Math.round(player.relevanciaCalc)
              }}</q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>
    </div>

    <!-- Um único formulário atende inclusão e edição. -->
    <q-dialog v-model="playerDialog">
      <q-card style="width: 420px; max-width: 95vw">
        <q-card-section>
          <div class="text-h6">
            {{ editingPlayer.id ? 'Editar atleta' : 'Adicionar atleta' }}
          </div>
        </q-card-section>
        <q-form @submit.prevent="savePlayer">
          <q-card-section class="q-gutter-md">
            <q-input
              v-model.trim="editingPlayer.name"
              label="Nome"
              :rules="[(value) => Boolean(value) || 'Informe o nome']"
            />
            <q-select
              v-model="editingPlayer.position"
              label="Posição"
              :options="positions"
            />
            <q-input
              v-model.number="editingPlayer.relevanciaBase"
              type="number"
              label="Relevância base"
              min="0"
            />
            <q-select
              v-model="editingPlayer.gender"
              label="Gênero"
              :options="['Homem', 'Mulher']"
            />
            <skill-rating v-model="editingPlayer.pass" label="Passe" />
            <skill-rating v-model="editingPlayer.attack" label="Ataque" />
            <skill-rating
              v-model="editingPlayer.positioning"
              label="Posicionamento"
            />
            <skill-rating v-model="editingPlayer.block" label="Bloqueio" />
            <skill-rating v-model="editingPlayer.serve" label="Saque" />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Cancelar" v-close-popup />
            <q-btn
              color="primary"
              label="Salvar"
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
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';
import { QRating, useQuasar, type QTableProps } from 'quasar';
import {
  calculatePlayerRelevance,
  emptyPlayer,
  type Player,
} from 'src/domain/player';
import {
  selectVolleyballTeams,
  type VolleyballTeam,
} from 'src/domain/team-selection';
import { canManagePlayers } from 'src/misc/auth';
import {
  deletePlayerFromFirestore,
  deletePlayersFromFirestore,
  subscribeToPlayers,
  updatePlayerOnFirestore,
  writePlayer,
} from 'src/misc/database';

/* ===========================================================
   CAMPO REUTILIZÁVEL DE HABILIDADE

   O pequeno componente evita repetir a configuração do QRating
   para passe, ataque, posicionamento, bloqueio e saque.
=========================================================== */

const SkillRating = defineComponent({
  name: 'SkillRating',
  props: {
    modelValue: { type: Number, required: true },
    label: { type: String, required: true },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('div', [
        h('div', { class: 'text-subtitle2' }, props.label),
        h(QRating, {
          modelValue: props.modelValue,
          color: 'primary',
          size: '2em',
          'onUpdate:modelValue': (value: number) =>
            emit('update:modelValue', value),
        }),
      ]);
  },
});

/* ===========================================================
   ESTADO DA PÁGINA
=========================================================== */

const $q = useQuasar();
const players = ref<Player[]>([]);
const teams = ref<VolleyballTeam[]>([]);
const balanceWomen = ref(false);
const loading = ref(true);
const saving = ref(false);
const loadError = ref('');
const selectAll = ref(false);
const playerDialog = ref(false);
const editingPlayer = ref<Player>(emptyPlayer());
let unsubscribePlayers: (() => void) | undefined;

const positions = [
  'Central',
  'Levantador',
  'Líbero',
  'Oposto',
  'Ponteiro',
  'Indefinido',
];
const relevanceByPosition: Record<string, number> = {
  Levantador: 1000,
  Ponteiro: 500,
  Central: 100,
  Oposto: 50,
  Líbero: 10,
  Indefinido: 10,
};

/* Colunas administrativas são filtradas para visitantes e membros. */
const columns: QTableProps['columns'] = [
  { name: 'selected', label: '', field: 'selected', align: 'center' },
  {
    name: 'order',
    label: 'Ordem',
    field: 'order',
    align: 'center',
    sortable: true,
  },
  { name: 'name', label: 'Nome', field: 'name', align: 'left', sortable: true },
  {
    name: 'position',
    label: 'Posição',
    field: 'position',
    align: 'left',
    sortable: true,
  },
  {
    name: 'relevanciaBase',
    label: 'Relevância',
    field: 'relevanciaBase',
    align: 'right',
    sortable: true,
  },
  {
    name: 'relevanciaCalc',
    label: 'Calculada',
    field: 'relevanciaCalc',
    align: 'right',
    sortable: true,
  },
  { name: 'actions', label: 'Ações', field: 'id', align: 'center' },
];

const visibleColumns = computed(() =>
  columns?.filter(
    (column) => column.name !== 'actions' || canManagePlayers.value,
  ),
);
const selectedPlayers = computed(() =>
  players.value.filter((player) => player.selected),
);
const teamInfo = computed(() => {
  const count = selectedPlayers.value.length;
  if (count > 21) return { message: 'O máximo é 21 atletas.', teams: 0 };
  if (count >= 15)
    return {
      message: `${count} atletas selecionados: serão formados 3 times.`,
      teams: 3,
    };
  if (count >= 8)
    return {
      message: `${count} atletas selecionados: serão formados 2 times.`,
      teams: 2,
    };
  return {
    message: `${count} atletas selecionados. Selecione pelo menos 8.`,
    teams: 0,
  };
});

/* Ao trocar de posição, sugere a relevância base histórica do projeto. */
watch(
  () => editingPlayer.value.position,
  (position, previous) => {
    if (position !== previous && relevanceByPosition[position] !== undefined) {
      editingPlayer.value.relevanciaBase = relevanceByPosition[position];
    }
  },
);

/* ===========================================================
   SINCRONIZAÇÃO EM TEMPO REAL

   As seleções locais são preservadas quando chega um novo retrato
   do Firestore, pois selected não faz parte do documento remoto.
=========================================================== */

onMounted(() => {
  unsubscribePlayers = subscribeToPlayers(
    (freshPlayers) => {
      const selectedIds = new Set(
        selectedPlayers.value.map((player) => player.id),
      );
      players.value = freshPlayers.map((player) => ({
        ...player,
        selected: selectedIds.has(player.id),
      }));
      selectAll.value =
        players.value.length > 0 &&
        players.value.every((player) => player.selected);
      loading.value = false;
      loadError.value = '';
    },
    () => {
      loading.value = false;
      loadError.value =
        'Não foi possível carregar os atletas. Confira a conexão com o Firebase.';
    },
  );
});

onBeforeUnmount(() => unsubscribePlayers?.());

/* ===========================================================
   AÇÕES DO CADASTRO
=========================================================== */

function toggleAll(value: boolean | null) {
  players.value.forEach((player) => {
    player.selected = Boolean(value);
  });
}

function openNewPlayer() {
  editingPlayer.value = emptyPlayer(players.value.length + 1);
  playerDialog.value = true;
}

function openEditPlayer(player: Player) {
  editingPlayer.value = { ...player };
  playerDialog.value = true;
}

async function savePlayer() {
  saving.value = true;
  editingPlayer.value.relevanciaCalc = calculatePlayerRelevance(
    editingPlayer.value,
  );
  try {
    if (editingPlayer.value.id) {
      await updatePlayerOnFirestore(editingPlayer.value);
      $q.notify({ type: 'positive', message: 'Atleta atualizado.' });
    } else {
      await writePlayer(editingPlayer.value);
      $q.notify({ type: 'positive', message: 'Atleta adicionado.' });
    }
    playerDialog.value = false;
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Não foi possível salvar o atleta.',
    });
  } finally {
    saving.value = false;
  }
}

async function deleteOne(player: Player) {
  if (!window.confirm(`Excluir ${player.name}?`)) return;
  try {
    await deletePlayerFromFirestore(player.id);
    $q.notify({ type: 'info', message: 'Atleta excluído.' });
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Não foi possível excluir o atleta.',
    });
  }
}

async function deleteSelected() {
  if (!window.confirm(`Excluir ${selectedPlayers.value.length} atleta(s)?`))
    return;
  try {
    await deletePlayersFromFirestore(
      selectedPlayers.value.map((player) => player.id),
    );
    $q.notify({ type: 'info', message: 'Atletas excluídos.' });
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Não foi possível excluir os atletas.',
    });
  }
}

/* A regra matemática permanece isolada e testável em domain/. */
function formTeams() {
  teams.value = selectVolleyballTeams(selectedPlayers.value, {
    balanceWomen: balanceWomen.value,
  });
  if (teams.value.length)
    $q.notify({ type: 'positive', message: 'Times formados.' });
}

/* ===========================================================
   CÓPIA DE SEGURANÇA

   Exportar não altera o banco. A inclusão de novos atletas passa
   exclusivamente pelo formulário do aplicativo.
=========================================================== */

function exportPlayers() {
  const content = JSON.stringify(
    players.value.map((player) => ({ ...player, selected: false })),
    null,
    2,
  );
  const link = document.createElement('a');
  link.href = URL.createObjectURL(
    new Blob([content], { type: 'application/json' }),
  );
  link.download = 'atletas-selector.json';
  link.click();
  URL.revokeObjectURL(link.href);
}
</script>

<style scoped>
.page-content {
  max-width: 1180px;
  margin: 0 auto;
}
.teams-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}
.team-card {
  min-width: 0;
}
</style>
