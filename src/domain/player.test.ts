import { describe, expect, it } from 'vitest';
import { calculatePlayerRelevance, normalizePlayer } from './player';

/* Testes unitários do cálculo e da fronteira de importação. */
describe('atletas', () => {
  it('calcula a relevância combinando a base com as cinco habilidades', () => {
    expect(calculatePlayerRelevance({
      relevanciaBase: 100,
      pass: 5,
      attack: 5,
      positioning: 5,
      block: 5,
      serve: 5,
    })).toBe(200);
  });

  it('normaliza dados importados sem aceitar números inválidos', () => {
    const player = normalizePlayer('abc', {
      name: '  Ana  ',
      relevanciaBase: Number.NaN,
      gender: 'Mulher',
    }, 3);
    expect(player).toMatchObject({ id: 'abc', name: 'Ana', order: 3, gender: 'Mulher' });
    expect(Number.isFinite(player.relevanciaCalc)).toBe(true);
  });
});
