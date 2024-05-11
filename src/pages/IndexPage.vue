<template>
  <q-page class="row items-center justify-evenly">
    <!-- Template do QTable com slot para o botão de editar -->
    <q-table
      title="Jogadores de Vôlei"
      :rows="players"
      :columns="columns"
      row-key="id"
      :rows-per-page-options="[0]"  
      :pagination="{ rowsPerPage: 0 }" 
    >
      <!-- Definindo o slot top para o checkbox de seleção geral -->
      <template v-slot:top>
        <q-tr>
          <q-th>
            <q-checkbox v-model="selectAll" @update:model-value="toggleAll" />
            Selecionar Todos
          </q-th>
          <q-th v-for="col in columns" :key="col.name">
          </q-th>
        </q-tr>
      </template>

      <!-- Definindo o slot body para os dados da tabela -->
      <template v-slot:body="props">
        <q-tr :props="props">
          <q-td key="checkbox">
            <q-checkbox v-model="props.row.selected" />
          </q-td>
          <q-td v-for="col in filteredColumns" :key="col.name">
            <template v-if="col.name !== 'actions'">
              {{ typeof col.field === 'function' ? col.field(props.row) : props.row[col.field] }}
            </template>
            <template v-if="col.name === 'actions'">
              <q-btn flat icon="edit" @click="editPlayer(props.row)" />
              <q-btn flat icon="delete" color="negative" @click="promptDeletePlayer(props.row)" />
            </template>
          </q-td>
        </q-tr>
      </template>
    </q-table>
    
    <q-dialog v-model="isDeleteDialogOpen">
      <q-card>
        <q-card-section class="row items-center">
          <q-icon name="warning" color="amber" />
          <span class="q-ml-sm">Você realmente deseja excluir este jogador?</span>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="primary" v-close-popup />
          <q-btn flat label="Excluir" color="negative" @click="confirmDelete" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-btn
      fab
      color="primary"
      class="q-ma-md"
      @click="showAddPlayerModal = true"
      icon="add"
      label="adicionar jogador"
    />
    <q-btn
      :disabled="teamInfo.teams === 0"
      label="Selecionar Times"
      @click="formTeams"
    />
    <q-banner>
      {{ teamInfo.message }}
    </q-banner>

    <div v-if="teams.length > 0">
      <div v-for="(team, index) in teams" :key="index">
        <h3>Time {{ index + 1 }} (Relevância Total: {{ team.totalRelevance }})</h3>
        <ul>
          <li v-for="player in team.players" :key="player.id">
            {{ player.name }} - {{ player.position }} (Relevância: {{ player.relevance }})
          </li>
        </ul>
      </div>
    </div>
    <div v-else>
      <p>Nenhum time formado ou dados ainda não processados.</p>
    </div>

    <!-- Modal para adicionar jogador -->
    <q-dialog v-model="showAddPlayerModal">
      <q-card>
        <q-card-section class="row items-center">
          <div class="text-h6">Adicionar Jogador</div>
        </q-card-section>
        <q-card-section>
          <q-form @submit.prevent="addPlayer">
            <q-input v-model="newPlayer.name" label="Nome" required></q-input>
            <q-select v-model="newPlayer.position" label="Posição" :options="positions" required></q-select>
            <q-input v-model="newPlayer.relevance" type="number" label="Relevância" required></q-input>
            <q-btn label="Adicionar" type="submit" color="primary"/>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Modal para editar jogador -->
    <q-dialog v-model="editPlayerDialog">
      <q-card>
        <q-card-section class="row items-center">
          <div class="text-h6">Editar Jogador</div>
        </q-card-section>
        <q-card-section>
          <q-form @submit.prevent="updatePlayer">
            <q-input v-model="editingPlayer.name" label="Nome" required></q-input>
            <q-select v-model="editingPlayer.position" :options="positions" label="Posição" required></q-select>
            <q-input v-model="editingPlayer.relevance" type="number" label="Relevância" required></q-input>
            <q-btn label="Atualizar" type="submit" color="primary"/>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref, Ref, watch, computed, onMounted } from 'vue';
import { 
  addPlayer as addPlayerService,
  getPlayers as getPlayersService,
  updatePlayer as updatePlayerService,
  deletePlayer as deletePlayerService
} from '../playersService';

interface Player {
  id: number;
  name: string;
  position: string;
  relevance: number;
  selected: boolean;
  order: number;
}

interface Column {
  name: string;
  label: string;
  field: string | ((row: any) => any);
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  format?: (val: any) => string;
  style?: string;
  required?: boolean;
}

interface Team {
  players: Player[];
  totalRelevance: number;
}

export default defineComponent({
  setup() {
    // onMounted(async () => {
    //   players.value = await getPlayersService();
    // });

    const players: Ref<Player[]> = ref([]);
    const teams = ref<{ players: Player[]; totalRelevance: number }[]>([]);
    const showAddPlayerModal = ref(false);
    const newPlayer = ref<Player>({ id: 0, name: '', position: '', relevance: 0, selected: false, order: 0 });
    const editPlayerDialog = ref(false); // Certifique-se de que esta é a única declaração de editPlayerDialog
    const editingPlayer = ref<Player>({ id: 0, name: '', position: '', relevance: 0, selected: false, order: 0 });
    const positions = ['Central', 'Levantador', 'Líbero', 'Oposto', 'Ponteiro', 'Indefinido'];

    const relevanceByPosition: Record<string, number> = {
      'Levantador': 1000,
      'Ponteiro': 500,
      'Central': 100,
      'Oposto': 50,      
      'Líbero': 10,
      'Indefinido': 1
    };

    const selectAll = ref(false);
    const selectedPlayers = computed(() => players.value.filter(p => p.selected));

    const teamInfo = computed(() => {
      const count = selectedPlayers.value.length;
      if (count >= 22) return { message: "Máximo de 21 jogadores permitidos", teams: 0 };
      else if (count >= 15) return { message: `${count} jogadores selecionados, formando 3 times`, teams: 3 };
      else if (count >= 14) return { message: `${count} jogadores selecionados, formando 2 times`, teams: 2 };
      else if (count >= 8) return { message: `${count} jogadores selecionados, formando 2 times`, teams: 2 };
      else return { message: `${count} jogadores selecionados, times não podem ser formados`, teams: 0 };
    });

    const columns: Ref<Array<Column>> = ref([
      { name: 'select', label: 'Select', field: 'selected', align: 'center', sortable: false },
      { name: 'order', label: 'Ordem', field: 'order', align: 'center', sortable: true, format: (val: number): string => val.toString().padStart(2, '0') },
      { name: 'name', label: 'Nome', field: 'name', align: 'left', sortable: true },
      { name: 'position', label: 'Posição', field: 'position', align: 'left', sortable: true },
      { name: 'relevance', label: 'Relevância', field: 'relevance', align: 'left', sortable: true, format: (val: number): string => val.toString().padStart(2, '0') },
      { name: 'actions', label: 'Ações', field: 'id', align: 'center', sortable: false, format: (): string => 'Editar' }
    ]);

    const filteredColumns = computed(() => columns.value.filter((c: Column) => c.name !== 'select'));

    watch(players, () => {
      savePlayers();
    }, { deep: true });

    watch(() => newPlayer.value.position, (newPosition) => {
      newPlayer.value.relevance = relevanceByPosition[newPosition] || 0;
    });

    watch(() => editingPlayer.value.position, (newPosition) => {
      editingPlayer.value.relevance = relevanceByPosition[newPosition] || 0;
    });

    function loadPlayers() {
      const storedPlayers = localStorage.getItem('players');
      if (storedPlayers) {
        players.value = JSON.parse(storedPlayers).map((player: Player, index: number) => ({
          ...player,
          order: index + 1,
          relevance: Number(player.relevance) // Assegura que a relevância é um número
        }));
      }
    }

    function savePlayers() {
      localStorage.setItem('players', JSON.stringify(players.value));
    }

    function addPlayer() {
      const newId = players.value.length > 0 ? Math.max(...players.value.map(p => p.id)) + 1 : 1;
      const newOrder = players.value.length + 1;
      const relevanceValue = Number(newPlayer.value.relevance); // Assegura que a relevância é um número

      const playerToAdd: Player = {
        ...newPlayer.value,
        id: newId,
        order: newOrder,
        relevance: relevanceValue
      };

      players.value.push(playerToAdd);
      showAddPlayerModal.value = false;
      newPlayer.value = { id: 0, name: '', position: '', relevance: 0, selected: false, order: newOrder + 1 };
    }
    // async function addPlayer() {
    //   const newPlayerData = {
    //     name: newPlayer.value.name,
    //     position: newPlayer.value.position,
    //     relevance: Number(newPlayer.value.relevance),
    //     selected: newPlayer.value.selected || false, // Garanta o valor padrão
    //     order: players.value.length + 1  // Ou algum outro cálculo para definir a ordem
    //   };

    //   await addPlayerService(newPlayerData);
    //   players.value = await getPlayersService();
    // }

    function editPlayer(player: Player) {
      editingPlayer.value = { ...player };
      editPlayerDialog.value = true;
    }

    function updatePlayer() {
      const index = players.value.findIndex(p => p.id === editingPlayer.value.id);
      if (index !== -1) {
        const updatedRelevance = Number(editingPlayer.value.relevance); // Assegura que a relevância é um número
        players.value[index] = { ...editingPlayer.value, relevance: updatedRelevance };
      }
      editPlayerDialog.value = false;
    }
    // async function updatePlayer() {
    //   if (editingPlayer.value) {
    //     const updatedData = {
    //       ...editingPlayer.value,
    //       relevance: Number(editingPlayer.value.relevance)
    //     };
    //     await updatePlayerService(editingPlayer.value.id, updatedData);
    //     players.value = await getPlayersService();
    //   }
    // }

    const isDeleteDialogOpen = ref(false);
    const playerToDelete: Ref<Player | null> = ref(null);
    const deletePlayer = (player: Player) => {
      const index = players.value.findIndex(p => p.id === player.id);
      if (index !== -1) {
        players.value.splice(index, 1);
      }
    };
    // async function deletePlayer() {
    //   if (playerToDelete.value) {
    //     await deletePlayerService(playerToDelete.value.id);
    //     players.value = await getPlayersService();
    //   }
    // }
    const confirmDelete = () => {
      if (playerToDelete.value) {
        deletePlayer(playerToDelete.value);
        playerToDelete.value = null; // Reset após exclusão
        isDeleteDialogOpen.value = false; // Fechar o diálogo após a exclusão
      }
    };
    const promptDeletePlayer = (player: Player) => {
      playerToDelete.value = player;
      isDeleteDialogOpen.value = true;
    };

    function toggleAll(newValue: boolean) {
      selectAll.value = newValue;
      players.value.forEach(player => player.selected = newValue);
    }

    function formTeams() {
        const numPlayers = selectedPlayers.value.length;
        const [numberOfTeams, teamSizes] = calculateTeamDistribution(numPlayers);

        if (numberOfTeams === 0) {
            alert("Não há jogadores suficientes para formar times ou o número máximo foi excedido.");
            teams.value = [];
            return;
        }

        // Agrupar jogadores por relevância
        const groups = groupByRelevance(selectedPlayers.value);
        const sortedKeys = Object.keys(groups).sort((a, b) => parseInt(b) - parseInt(a)); // Ordena chaves de relevância em ordem decrescente

        // Inicializa os times
        let newTeams = teamSizes.map(size => ({
            players: [] as Player[],
            totalRelevance: 0
        }));

        // Distribuir jogadores começando do grupo de maior relevância
        sortedKeys.forEach(key => {
            let players = shuffleArray(groups[key]);
            players.forEach(player => {
                let minRelevanceTeamIndex = newTeams.reduce((minIndex, currentTeam, currentIndex) => {
                    if (newTeams[minIndex].players.length >= teamSizes[minIndex]) {
                        return currentIndex;
                    }
                    return currentTeam.totalRelevance < newTeams[minIndex].totalRelevance && currentTeam.players.length < teamSizes[currentIndex] ? currentIndex : minIndex;
                }, 0);

                newTeams[minRelevanceTeamIndex].players.push(player);
                newTeams[minRelevanceTeamIndex].totalRelevance += player.relevance;
            });
        });

        teams.value = newTeams;
    }

    function groupByRelevance(players: Player[]): Record<string, Player[]> {
      return players.reduce((groups: Record<string, Player[]>, player: Player) => {
        const key = player.relevance.toString();
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(player);
        return groups;
      }, {});
    }

    function shuffleArray(array: Player[]): Player[] {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }

    function calculateTeamDistribution(numPlayers: number): [number, number[]] {
        if (numPlayers < 8) return [0, []];  // Não formar times se menos de 8 jogadores
        if (numPlayers > 21) return [0, []]; // Máximo de 21 jogadores permitidos

        const distributions: Record<number, number[]> = {
            8: [4, 4],
            9: [4, 5],
            10: [5, 5],
            11: [5, 6],
            12: [6, 6],
            13: [6, 7],
            14: [7, 7],
            15: [5, 5, 5],
            16: [5, 5, 6],
            17: [5, 6, 6],
            18: [6, 6, 6],
            19: [6, 6, 7],
            20: [6, 7, 7],
            21: [7, 7, 7],
        };

        const teamSetup = distributions[numPlayers];
        return [teamSetup.length, teamSetup];
    }

    loadPlayers();

    return {
      players, deletePlayer, showAddPlayerModal, newPlayer, positions, editPlayerDialog, editingPlayer,
      addPlayer, editPlayer, updatePlayer, selectedPlayers, teamInfo, formTeams, teams, selectAll,
      toggleAll, columns, filteredColumns, isDeleteDialogOpen, confirmDelete, promptDeletePlayer
    };

  }
});
</script>

<style scoped>
.q-page {
  padding: 5%; /* Adiciona uma borda de 5% em todos os lados */
  display: flex;
  flex-direction: column;
  align-items: center; /* Centraliza os elementos filhos horizontalmente */
}

.q-table {
  width: 90%; /* Define a largura da tabela como 90% da largura do container */
  max-width: 100%; /* Garante que a tabela nunca exceda a largura do container */
}

.q-dialog {
  min-width: 300px; /* Define uma largura mínima para os diálogos */
}

.q-btn {
  margin: 5px; /* Adiciona uma pequena margem ao redor dos botões */
}

.q-card {
  width: 100%; /* Faz com que o card ocupe toda a largura disponível do diálogo */
}

.q-banner {
  width: 100%; /* Faz com que o banner ocupe toda a largura do container */
  text-align: center; /* Centraliza o texto dentro do banner */
}

.q-input, .q-select {
  width: 100%; /* Faz com que inputs e selects ocupem toda a largura disponível */
  margin-bottom: 10px; /* Adiciona espaço abaixo dos campos de input */
}
</style>