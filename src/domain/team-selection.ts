import type { Player } from './player';

export interface VolleyballTeam {
  players: Player[];
  totalRelevance: number;
}

/* ===========================================================
   TAMANHOS VÁLIDOS DOS TIMES

   De 8 a 14 atletas são formados dois times; de 15 a 21, três.
   Fora dessa faixa a seleção retorna vazia.
=========================================================== */

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

export function calculateTeamDistribution(playerCount: number): number[] {
  return [...(distributions[playerCount] ?? [])];
}

/* O gerador aleatório pode ser substituído nos testes para que o
   mesmo cenário produza sempre o mesmo resultado. */
function shuffled<T>(items: T[], random: () => number) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

/* Recalcula o total depois de uma troca entre times. */
function refreshTotal(team: VolleyballTeam) {
  team.totalRelevance = team.players.reduce((sum, player) => sum + player.relevanciaCalc, 0);
}

/* ===========================================================
   EQUILÍBRIO DE GÊNERO

   Troca uma mulher do time excedente por um homem de relevância
   próxima no time deficitário, preservando o número de atletas.
=========================================================== */

function balanceTeamsByGender(teams: VolleyballTeam[]) {
  const womenCount = teams.reduce(
    (total, team) => total + team.players.filter((player) => player.gender === 'Mulher').length,
    0,
  );
  const minimum = Math.floor(womenCount / teams.length);
  const maximum = Math.ceil(womenCount / teams.length);

  for (let attempts = 0; attempts < 50; attempts += 1) {
    const counts = teams.map((team) => team.players.filter((player) => player.gender === 'Mulher').length);
    const sourceIndex = counts.findIndex((count) => count > maximum);
    const targetIndex = counts.findIndex((count) => count < minimum);
    if (sourceIndex < 0 || targetIndex < 0) break;

    const source = teams[sourceIndex];
    const target = teams[targetIndex];
    const exchanges = source.players
      .filter((player) => player.gender === 'Mulher')
      .flatMap((woman) =>
        target.players
          .filter((player) => player.gender === 'Homem')
          .map((man) => ({ woman, man, distance: Math.abs(woman.relevanciaCalc - man.relevanciaCalc) })),
      )
      .sort((left, right) => left.distance - right.distance);

    const exchange = exchanges[0];
    if (!exchange) break;
    source.players[source.players.indexOf(exchange.woman)] = exchange.man;
    target.players[target.players.indexOf(exchange.man)] = exchange.woman;
    refreshTotal(source);
    refreshTotal(target);
  }
}

/* ===========================================================
   FORMAÇÃO PRINCIPAL

   Os atletas mais relevantes entram primeiro e cada novo atleta
   vai para o time elegível de menor soma. O embaralhamento resolve
   empates sem alterar a regra de equilíbrio.
=========================================================== */

export function selectVolleyballTeams(
  players: Player[],
  options: { balanceWomen?: boolean; random?: () => number } = {},
): VolleyballTeam[] {
  const sizes = calculateTeamDistribution(players.length);
  if (sizes.length === 0) return [];

  const candidates = shuffled(players, options.random ?? Math.random).sort(
    (left, right) => right.relevanciaCalc - left.relevanciaCalc,
  );
  const teams = sizes.map((): VolleyballTeam => ({ players: [], totalRelevance: 0 }));

  for (const player of candidates) {
    const target = teams
      .map((team, index) => ({ team, index }))
      .filter(({ team, index }) => team.players.length < sizes[index])
      .sort((left, right) => {
        const relevanceDifference = left.team.totalRelevance - right.team.totalRelevance;
        return relevanceDifference || left.team.players.length - right.team.players.length;
      })[0];

    target.team.players.push(player);
    target.team.totalRelevance += player.relevanciaCalc;
  }

  if (options.balanceWomen) balanceTeamsByGender(teams);
  return teams;
}
