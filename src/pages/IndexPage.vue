<template>
  <q-page class="row items-center justify-evenly">
    <q-table
      title="Jogadores de Vôlei"
      :rows="players"
      :columns="columns"
      row-key="id"
      :rows-per-page-options="[0]"
      :pagination="{ rowsPerPage: 0 }"
    >
      <template v-slot:top>
        <q-tr>
          <q-th>
            <q-checkbox v-model="selectAll" color="green" @update:model-value="toggleAll" />
            Selecionar Todos
          </q-th>
          <q-th v-for="col in columns" :key="col.name"></q-th>
        </q-tr>
      </template>
      <template v-slot:body="props">
        <q-tr :props="props">
          <q-td key="checkbox">
            <q-checkbox color="green" v-model="props.row.selected" />
          </q-td>
          <q-td v-for="col in filteredColumns" :key="col.name">
            <template v-if="col.name !== 'actions'">
              {{ typeof col.field === 'function' ? col.field(props.row) : props.row[col.field] }}
            </template>
            <template v-if="col.name === 'actions'">
              <q-btn flat icon="edit" color="black" @click="editPlayer(props.row)" />
              <q-btn flat icon="delete" color="negative" @click="promptDeletePlayer(props.row)" />
            </template>
          </q-td>
        </q-tr>
      </template>
    </q-table>
    
    <q-dialog v-model="isDeleteDialogOpen">
      <q-card>
        <q-card-section class="row items-center">
          <q-icon name="warning" color="orange" />
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
      label="Adicionar Jogador"
    />
    <q-btn
      fab
      color="green"
      class="q-ma-md"
      @click="mainTeamFormationProcess"
      icon="done"
      label=". Selecionar Times"
      :disabled="teamInfo.teams === 0"
    />
    <q-toggle v-model="balanceWomen" label="Equilibrar Mulheres" class="q-ma-md" color="orange" />

    <q-banner>
      {{ teamInfo.message }}
    </q-banner>

    <div v-if="teams.length > 0">
      <div v-for="(team, index) in teams" :key="index">
        <h3>Time {{ index + 1 }} (Relevância Total: {{ Math.round(team.totalRelevance) }})</h3>
        <ul>
          <li v-for="player in team.players" :key="player.id">
            {{ player.name }} - {{ player.position }} (Relevância: {{ Math.round(player.relevanciaCalc) }})
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
            <q-input v-model="newPlayer.relevanciaBase" type="number" label="Relevância Base" required></q-input>

            <!-- Novo campo de seleção de gênero -->
            <q-select v-model="newPlayer.gender" label="Gênero" :options="['Homem', 'Mulher']" required></q-select>

            <!-- Novos campos de avaliação -->
            <div class="q-mt-md">
              <div class="text-subtitle2">Passe</div>
              <q-rating v-model="newPlayer.pass" size="lg" />
            </div>
            <div class="q-mt-md">
              <div class="text-subtitle2">Ataque</div>
              <q-rating v-model="newPlayer.attack" size="lg" />
            </div>
            <div class="q-mt-md">
              <div class="text-subtitle2">Posicionamento</div>
              <q-rating v-model="newPlayer.positioning" size="lg" />
            </div>

            <q-btn label="Adicionar" type="submit" color="primary" class="q-mt-md" />
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
            <q-input v-model="editingPlayer.relevanciaBase" type="number" label="Relevância Base" required></q-input>

            <!-- Novo campo de seleção de gênero -->
            <q-select v-model="editingPlayer.gender" label="Gênero" :options="['Homem', 'Mulher']" required></q-select>

            <!-- Novos campos de avaliação -->
            <div class="q-mt-md">
              <div class="text-subtitle2">Passe</div>
              <q-rating v-model="editingPlayer.pass" size="lg" />
            </div>
            <div class="q-mt-md">
              <div class="text-subtitle2">Ataque</div>
              <q-rating v-model="editingPlayer.attack" size="lg" />
            </div>
            <div class="q-mt-md">
              <div class="text-subtitle2">Posicionamento</div>
              <q-rating v-model="editingPlayer.positioning" size="lg" />
            </div>

            <q-btn label="Atualizar" type="submit" color="primary" class="q-mt-md" />
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, ref, Ref, watch, computed } from 'vue';

interface Player {
  id: number;
  name: string;
  position: string;
  relevanciaBase: number;
  relevanciaCalc: number;
  gender: 'Homem' | 'Mulher';
  selected: boolean;
  order: number;
  pass: number;
  attack: number;
  positioning: number;
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
  // menCount?: number;
  // womenCount?: number;
}

interface ExcessOrDeficit {
    index: number;
    womenCount: number;
}

export default defineComponent({
  setup() {
    const players: Ref<Player[]> = ref([]);
    const teams = ref<{ players: Player[]; totalRelevance: number }[]>([]);
    const showAddPlayerModal = ref(false);
    const newPlayer = ref<Player>({ id: 0, name: '', position: '', relevanciaBase: 0, relevanciaCalc: 0, gender: 'Homem', selected: false, order: 0, pass: 0, attack: 0, positioning: 0 });
    const editPlayerDialog = ref(false);
    const editingPlayer = ref<Player>({ id: 0, name: '', position: '', relevanciaBase: 0, relevanciaCalc: 0, gender: 'Homem', selected: false, order: 0, pass: 0, attack: 0, positioning: 0 });
    const positions = ['Central', 'Levantador', 'Líbero', 'Oposto', 'Ponteiro', 'Indefinido'];
    
    const calculateTotalRelevance = (player: Player) => {
      const bonusMultiplier = Number((player.pass + player.attack + player.positioning) / 15);
      return Number(Math.round(player.relevanciaBase * (1 + bonusMultiplier)));   
    };

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
    const balanceWomen: Ref<boolean> = ref(false);

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
      { name: 'relevanciaBase', label: 'Relevância Base', field: 'relevanciaBase', align: 'left', sortable: true },
      { name: 'relevanciaCalc', label: 'Relevância Calculada', field: 'relevanciaCalc', align: 'left', sortable: true },
      { name: 'actions', label: 'Ações', field: 'id', align: 'center', sortable: false }
    ]);

    const filteredColumns = computed(() => columns.value.filter((c: Column) => c.name !== 'select'));

    watch(() => newPlayer.value.position, (newPosition) => {
      newPlayer.value.relevanciaBase = relevanceByPosition[newPosition] || 0;
      newPlayer.value.relevanciaCalc = Number(calculateTotalRelevance(newPlayer.value));
    });

    watch(() => [editingPlayer.value.pass, editingPlayer.value.attack, editingPlayer.value.positioning, editingPlayer.value.relevanciaBase], () => {
      editingPlayer.value.relevanciaCalc = Number(calculateTotalRelevance(editingPlayer.value));
    }, { deep: true });

    watch(players, () => {
      savePlayers();
    }, { deep: true });

    function loadPlayers() {
      const storedPlayers = localStorage.getItem('players');
      if (storedPlayers) {
        players.value = JSON.parse(storedPlayers).map((player: Player, index: number) => ({
          ...player,
          order: index + 1,
          relevanciaBase: Number(player.relevanciaBase),
          pass: Number(player.pass || 0),
          attack: Number(player.attack || 0),
          positioning: Number(player.positioning || 0),
          relevanciaCalc: Number(calculateTotalRelevance(player))
        }));
      }
    }

    function savePlayers() {
      localStorage.setItem('players', JSON.stringify(players.value.map(player => ({
        ...player,
        relevanciaCalc: undefined
      }))));
    }

    function addPlayer() {
      const newId = players.value.length > 0 ? Math.max(...players.value.map(p => p.id)) + 1 : 1;
      const newOrder = players.value.length + 1;

      const playerToAdd: Player = {
        ...newPlayer.value,
        id: newId,
        order: newOrder,
        relevanciaCalc: Number(calculateTotalRelevance(newPlayer.value))
      };

      players.value.push(playerToAdd);
      showAddPlayerModal.value = false;
      resetNewPlayer();
    }

    function editPlayer(player: Player) {
      editingPlayer.value = { ...player };
      editPlayerDialog.value = true;
    }

    function updatePlayer() {
      const index = players.value.findIndex(p => p.id === editingPlayer.value.id);
      if (index !== -1) {
        players.value[index] = {
          ...editingPlayer.value,
          relevanciaCalc: Number(calculateTotalRelevance(editingPlayer.value))
        };
      }
      editPlayerDialog.value = false;
    }

    function resetNewPlayer() {
      newPlayer.value = { id: 0, name: '', position: '', relevanciaBase: 0, relevanciaCalc: 0, gender: 'Homem', selected: false, order: players.value.length + 1, pass: 0, attack: 0, positioning: 0 };
    }

    const isDeleteDialogOpen = ref(false);
    const playerToDelete: Ref<Player | null> = ref(null);
    const deletePlayer = (player: Player) => {
      const index = players.value.findIndex(p => p.id === player.id);
      if (index !== -1) {
        players.value.splice(index, 1);
      }
    };
 
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

        // Ordena chaves de relevância em ordem decrescente
        const sortedKeys = Object.keys(groups).sort((a, b) => parseInt(b) - parseInt(a));

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
                newTeams[minRelevanceTeamIndex].totalRelevance += Number(player.relevanciaCalc);
            });
        });

        teams.value = newTeams;
    }

    function groupByRelevance(players: Player[]): Record<string, Player[]> {
      return players.reduce((groups: Record<string, Player[]>, player: Player) => {
        const key = player.relevanciaBase.toString();
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

    function balanceTeamsByGender() {
        const totalWomen = teams.value.reduce((acc, team) => acc + team.players.filter(p => p.gender === 'Mulher').length, 0);
        const womenPerTeam = Math.floor(totalWomen / teams.value.length);

        let excessTeams: ExcessOrDeficit[] = [];
        let deficitTeams: ExcessOrDeficit[] = [];

        // Identificar times com excesso e déficit de mulheres
        teams.value.forEach((team, index) => {
            const womenCount = team.players.filter(p => p.gender === 'Mulher').length;
            if (womenCount > womenPerTeam) {
                excessTeams.push({ index, womenCount });
            } else if (womenCount < womenPerTeam) {
                deficitTeams.push({ index, womenCount });
            }
        });

        // Função para encontrar e realizar trocas de jogadores para equilibrar os times
        function makeTrades() {
            excessTeams.forEach(excess => {
                while (excess.womenCount > womenPerTeam && deficitTeams.length > 0) {
                    let deficit = deficitTeams[0];

                    let womanToTrade = teams.value[excess.index].players.find(p => 
                        p.gender === 'Mulher' && 
                        teams.value[deficit.index].players.some(m => m.gender === 'Homem' && m.relevanciaBase === p.relevanciaBase)
                    );
                    let manToTrade = teams.value[deficit.index].players.find(m => 
                        m.gender === 'Homem' && 
                        womanToTrade && m.relevanciaBase === womanToTrade.relevanciaBase
                    );

                    if (womanToTrade && manToTrade) {
                        // Filtra jogadores com segurança usando ?. para evitar erros de undefined
                        teams.value[excess.index].players = teams.value[excess.index].players.filter(p => p.id !== womanToTrade?.id);
                        teams.value[deficit.index].players = teams.value[deficit.index].players.filter(p => p.id !== manToTrade?.id);

                        // Adiciona os jogadores trocados aos times correspondentes
                        teams.value[excess.index].players.push(manToTrade);
                        teams.value[deficit.index].players.push(womanToTrade);

                        // Atualiza a contagem de mulheres
                        excess.womenCount--;
                        deficit.womenCount++;

                        // Se o time de déficit atingir o número ideal, remove da lista de déficits
                        if (deficit.womenCount === womenPerTeam) {
                            deficitTeams.shift();
                        }
                    } else {
                        // Se não encontrar trocas possíveis, interrompe para evitar loop infinito
                        break;
                    }
                }
            });

            // Remove times de excesso que já foram equilibrados
            excessTeams = excessTeams.filter(team => team.womenCount > womenPerTeam);
        }

        // Continua as trocas enquanto houver times desequilibrados
        while (excessTeams.length > 0 && deficitTeams.length > 0) {
            makeTrades();
        }
    }

    function mainTeamFormationProcess() {
        formTeams(); // Chama a formação inicial dos times

        if (balanceWomen.value) {
            balanceTeamsByGender(); // Equilibra os times se o toggle estiver ativado
        }
    }

    loadPlayers();

    return {
      players, deletePlayer, showAddPlayerModal, newPlayer, positions, editPlayerDialog, editingPlayer,
      addPlayer, editPlayer, updatePlayer, selectedPlayers, teamInfo, formTeams, teams, selectAll,
      toggleAll, balanceWomen, mainTeamFormationProcess, columns, filteredColumns, isDeleteDialogOpen, confirmDelete, promptDeletePlayer
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