import { describe, expect, it } from 'vitest';
import { emptyPlayer, type Player } from './player';
import { calculateTeamDistribution, selectVolleyballTeams } from './team-selection';

/* A fábrica gera atletas suficientes sem repetir grandes fixtures. */
const makePlayers = (count: number): Player[] => Array.from({ length: count }, (_, index) => ({
  ...emptyPlayer(index + 1),
  id: String(index + 1),
  name: `Atleta ${index + 1}`,
  gender: index % 3 === 0 ? 'Mulher' : 'Homem',
  relevanciaCalc: 1000 - index * 20,
}));

/* As três propriedades essenciais são tamanho, unicidade e equilíbrio. */
describe('seleção de times', () => {
  it.each([
    [7, []],
    [8, [4, 4]],
    [14, [7, 7]],
    [15, [5, 5, 5]],
    [21, [7, 7, 7]],
    [22, []],
  ])('define a distribuição para %i atletas', (count, expected) => {
    expect(calculateTeamDistribution(count)).toEqual(expected);
  });

  it('usa todos os atletas uma única vez e respeita os tamanhos', () => {
    const teams = selectVolleyballTeams(makePlayers(17), { random: () => 0.5 });
    expect(teams.map((team) => team.players.length)).toEqual([5, 6, 6]);
    const ids = teams.flatMap((team) => team.players.map((player) => player.id));
    expect(new Set(ids).size).toBe(17);
  });

  it('equilibra a presença de mulheres entre os times', () => {
    const teams = selectVolleyballTeams(makePlayers(18), { balanceWomen: true, random: () => 0.5 });
    const counts = teams.map((team) => team.players.filter((player) => player.gender === 'Mulher').length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });
});
